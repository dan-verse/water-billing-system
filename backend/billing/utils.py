from decimal import Decimal
from datetime import date, timedelta
from django.db.models import Q
from django.utils import timezone

def calculate_tiered_consumption_charge(consumption, rate_type='residential'):
    """
    Calculate water charges based on tiered pricing
    Matches SRS billing formula
    
    Returns: (total_charge, breakdown_list)
    """
    from accounts.models import WaterRate
    
    today = timezone.now().date()
    rates = WaterRate.objects.filter(
        rate_type=rate_type,
        is_active=True,
        effective_from__lte=today
    ).filter(
        Q(effective_to__gte=today) | Q(effective_to__isnull=True)
    ).order_by('tier_start')
    
    if not rates.exists():
        raise ValueError(f"No active water rates found for {rate_type}")
    
    total_charge = Decimal('0.00')
    breakdown = []
    remaining = Decimal(str(consumption))
    
    for rate in rates:
        if remaining <= 0:
            break
        
        tier_start = rate.tier_start
        tier_end = rate.tier_end if rate.tier_end else Decimal('999999')
        tier_capacity = tier_end - tier_start
        
        # Calculate usage in this tier
        usage_in_tier = min(remaining, tier_capacity)
        tier_charge = usage_in_tier * rate.price_per_unit
        
        breakdown.append({
            'tier_name': rate.tier_name,
            'usage': float(usage_in_tier),
            'rate': float(rate.price_per_unit),
            'charge': float(tier_charge)
        })
        
        total_charge += tier_charge
        remaining -= usage_in_tier
    
    return total_charge, breakdown


def calculate_bill_from_reading(meter_reading):
    """
    Generate complete bill from meter reading
    Implements SRS billing specification
    
    Formula: Total = (Consumption Charge + Base Charge) * (1 + Tax Rate) - Discount
    """
    from accounts.models import Bill, Notification
    
    # Check if bill already exists
    if hasattr(meter_reading, 'bill'):
        raise ValueError("Bill already exists for this reading")
    
    user = meter_reading.user
    consumption = meter_reading.consumption
    
    # Calculate consumption charge using tiered rates
    consumption_charge, breakdown = calculate_tiered_consumption_charge(
        consumption,
        rate_type='residential'  # Can be made dynamic based on user type
    )
    
    # Base charge (fixed monthly fee)
    base_charge = Decimal('50.00')
    
    # Calculate tax (16% VAT in Kenya)
    subtotal = consumption_charge + base_charge
    tax_rate = Decimal('0.16')
    tax_amount = subtotal * tax_rate
    
    # Check for discounts (conservation bonus)
    discount = calculate_conservation_discount(meter_reading)
    
    # Set due date (30 days from now)
    due_date = date.today() + timedelta(days=30)
    
    # Create bill
    bill = Bill.objects.create(
        user=user,
        meter_reading=meter_reading,
        due_date=due_date,
        consumption_charge=consumption_charge,
        base_charge=base_charge,
        tax_amount=tax_amount,
        discount=discount
    )
    
    # Create notification
    Notification.objects.create(
        user=user,
        notification_type='bill_generated',
        title='New Bill Generated',
        message=f'Your water bill for {meter_reading.billing_period_start} to {meter_reading.billing_period_end} is ready. Amount: KSh {bill.total_amount}',
        bill=bill
    )
    
    return bill


def calculate_conservation_discount(meter_reading):
    """
    Calculate discount for reduced water usage
    Conservation incentive: 5% discount if usage decreased by 10%+ from previous period
    """
    from accounts.models import MeterReading
    
    discount = Decimal('0.00')
    
    try:
        # Get previous reading
        previous = MeterReading.objects.filter(
            user=meter_reading.user,
            billing_period_end__lt=meter_reading.billing_period_start
        ).order_by('-billing_period_end').first()
        
        if previous and previous.consumption > 0:
            reduction = previous.consumption - meter_reading.consumption
            reduction_percent = (reduction / previous.consumption) * 100
            
            if reduction_percent >= 10:
                # 5% discount on consumption charge
                consumption_charge, _ = calculate_tiered_consumption_charge(
                    meter_reading.consumption
                )
                discount = consumption_charge * Decimal('0.05')
    except Exception:
        pass
    
    return discount


def process_payment(bill_id, amount, payment_method, payment_reference=''):
    """
    Process payment and update bill status
    Simulates payment gateway integration
    """
    from accounts.models import Bill, Payment, Notification
    import random
    
    bill = Bill.objects.get(id=bill_id)
    amount = Decimal(str(amount))
    
    # Validate payment amount
    if amount <= 0:
        raise ValueError("Payment amount must be positive")
    
    if amount > bill.balance_due:
        raise ValueError(f"Payment amount (KSh {amount}) exceeds balance due (KSh {bill.balance_due})")
    
    # Simulate gateway response
    gateway_response = {
        'status': 'success',
        'gateway': 'simulated',
        'timestamp': timezone.now().isoformat(),
        'reference': payment_reference or f"SIM-{random.randint(100000, 999999)}"
    }
    
    # Create payment record
    payment = Payment.objects.create(
        bill=bill,
        amount=amount,
        payment_method=payment_method,
        payment_reference=payment_reference,
        gateway_response=gateway_response,
        is_verified=True  # Auto-verify in simulation
    )
    
    # Bill.save() will auto-update paid_amount and status
    
    # Create notification
    Notification.objects.create(
        user=bill.user,
        notification_type='payment_received',
        title='Payment Received',
        message=f'Payment of KSh {amount} received for bill {bill.bill_number}. Remaining balance: KSh {bill.balance_due}',
        bill=bill,
        payment=payment
    )
    
    return payment


def apply_late_fees():
    """
    Apply late fees to overdue bills
    Can be run as a scheduled task (cron job)
    """
    from accounts.models import Bill, Notification
    
    overdue_bills = Bill.objects.filter(
        status='pending',
        due_date__lt=date.today(),
        late_fee=Decimal('0.00')
    )
    
    for bill in overdue_bills:
        # 5% late fee or minimum KSh 50
        late_fee = max(bill.total_amount * Decimal('0.05'), Decimal('50.00'))
        bill.late_fee = late_fee
        bill.status = 'overdue'
        bill.save()
        
        # Notify customer
        Notification.objects.create(
            user=bill.user,
            notification_type='overdue',
            title='Payment Overdue',
            message=f'Bill {bill.bill_number} is overdue. Late fee of KSh {late_fee} has been applied. Please pay immediately.',
            bill=bill
        )
    
    return overdue_bills.count()


def send_payment_reminders():
    """
    Send reminders for bills due in 3 days
    Can be run as a scheduled task
    """
    from accounts.models import Bill, Notification
    
    reminder_date = date.today() + timedelta(days=3)
    
    bills_due_soon = Bill.objects.filter(
        status='pending',
        due_date=reminder_date
    )
    
    for bill in bills_due_soon:
        # Check if reminder already sent
        existing_reminder = Notification.objects.filter(
            user=bill.user,
            bill=bill,
            notification_type='payment_due',
            created_at__date=date.today()
        ).exists()
        
        if not existing_reminder:
            Notification.objects.create(
                user=bill.user,
                notification_type='payment_due',
                title='Payment Reminder',
                message=f'Bill {bill.bill_number} of KSh {bill.balance_due} is due on {bill.due_date}. Please pay to avoid late fees.',
                bill=bill
            )
    
    return bills_due_soon.count()


def generate_usage_report(user, start_date, end_date):
    """
    Generate usage analytics report for a user
    """
    from accounts.models import MeterReading, Bill
    from django.db.models import Sum, Avg, Max, Min
    
    readings = MeterReading.objects.filter(
        user=user,
        reading_date__range=[start_date, end_date]
    )
    
    bills = Bill.objects.filter(
        user=user,
        issue_date__range=[start_date, end_date]
    )
    
    stats = readings.aggregate(
        total_consumption=Sum('consumption'),
        avg_consumption=Avg('consumption'),
        max_consumption=Max('consumption'),
        min_consumption=Min('consumption'),
    )
    
    billing_stats = bills.aggregate(
        total_billed=Sum('total_amount'),
        total_paid=Sum('paid_amount'),
    )
    
    return {
        'period': {
            'start': start_date,
            'end': end_date
        },
        'consumption': {
            'total': float(stats['total_consumption'] or 0),
            'average': float(stats['avg_consumption'] or 0),
            'max': float(stats['max_consumption'] or 0),
            'min': float(stats['min_consumption'] or 0),
        },
        'billing': {
            'total_billed': float(billing_stats['total_billed'] or 0),
            'total_paid': float(billing_stats['total_paid'] or 0),
            'balance': float((billing_stats['total_billed'] or 0) - (billing_stats['total_paid'] or 0))
        },
        'readings_count': readings.count(),
        'bills_count': bills.count(),
    }