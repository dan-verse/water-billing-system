from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from decimal import Decimal

class User(AbstractUser):
    """Extended User model matching SRS specifications"""
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('customer', 'Customer'),
        ('operator', 'Billing Operator'),  # Added per SRS
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')
    phone_number = models.CharField(
        max_length=15, 
        validators=[RegexValidator(r'^\+?254\d{9}$', 'Enter valid Kenyan number')]
    )
    address = models.TextField()
    meter_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    
    # Account status
    is_active_customer = models.BooleanField(default=True)
    registration_date = models.DateField(auto_now_add=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        return self.role == 'admin'
    
    @property
    def is_customer(self):
        return self.role == 'customer'
    
    @property
    def outstanding_balance(self):
        """Calculate total outstanding balance"""
        return self.bills.filter(status='pending').aggregate(
            total=models.Sum('total_amount')
        )['total'] or Decimal('0.00')


class WaterRate(models.Model):
    """Tiered water pricing - matches SRS billing structure"""
    RATE_TYPE_CHOICES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
    ]
    
    rate_type = models.CharField(max_length=20, choices=RATE_TYPE_CHOICES)
    tier_name = models.CharField(max_length=50)  # e.g., "First 10 units"
    tier_start = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Usage start (m³)"
    )
    tier_end = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True, 
        blank=True,
        help_text="Usage end (m³), null = unlimited"
    )
    price_per_unit = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Price per m³ in KSh"
    )
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['rate_type', 'tier_start']
        verbose_name = "Water Rate"
        verbose_name_plural = "Water Rates"
    
    def __str__(self):
        return f"{self.get_rate_type_display()} - {self.tier_name}: KSh {self.price_per_unit}/m³"


class MeterReading(models.Model):
    """Meter readings - matches SRS meter reading process"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meter_readings')
    
    # Reading details
    reading_date = models.DateField()
    previous_reading = models.DecimalField(max_digits=10, decimal_places=2)
    current_reading = models.DecimalField(max_digits=10, decimal_places=2)
    consumption = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        editable=False,
        help_text="Auto-calculated: current - previous"
    )
    
    # Billing period
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()
    
    # Reading metadata
    reading_type = models.CharField(
        max_length=10,
        choices=[('manual', 'Manual'), ('automated', 'Automated')],
        default='manual'
    )
    recorded_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='recorded_readings',
        limit_choices_to={'role__in': ['admin', 'operator']}
    )
    
    # Anomaly detection
    is_anomaly = models.BooleanField(default=False)
    anomaly_reason = models.TextField(blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-reading_date']
        unique_together = ['user', 'billing_period_start']
    
    def save(self, *args, **kwargs):
        # Auto-calculate consumption
        self.consumption = self.current_reading - self.previous_reading
        
        # Check for anomalies (consumption > 200% of avg)
        if self.consumption > 0:
            avg_consumption = MeterReading.objects.filter(
                user=self.user
            ).exclude(pk=self.pk).aggregate(
                avg=models.Avg('consumption')
            )['avg'] or Decimal('50')
            
            if self.consumption > (avg_consumption * Decimal('2')):
                self.is_anomaly = True
                self.anomaly_reason = f"Usage spike: {self.consumption}m³ (avg: {avg_consumption:.2f}m³)"
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user.username} - {self.billing_period_start} to {self.billing_period_end}"


class Bill(models.Model):
    """Bills - matches SRS billing specification"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('partially_paid', 'Partially Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bills')
    meter_reading = models.OneToOneField(
        MeterReading, 
        on_delete=models.CASCADE, 
        related_name='bill'
    )
    
    # Bill identification
    bill_number = models.CharField(max_length=50, unique=True, editable=False)
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    
    # Billing components (all in KSh)
    consumption_charge = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Charge based on tiered usage"
    )
    base_charge = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Fixed monthly charge"
    )
    tax_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="VAT/Tax (16% in Kenya)"
    )
    late_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00')
    )
    discount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        editable=False
    )
    
    # Payment tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00')
    )
    payment_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-issue_date']
    
    def save(self, *args, **kwargs):
        # Generate bill number
        if not self.bill_number:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.bill_number = f"MB-{self.user.id:04d}-{timestamp}"
        
        # Calculate total
        self.total_amount = (
            self.consumption_charge + 
            self.base_charge + 
            self.tax_amount + 
            self.late_fee - 
            self.discount
        )
        
        # Update status based on payment
        if self.paid_amount >= self.total_amount:
            self.status = 'paid'
        elif self.paid_amount > 0:
            self.status = 'partially_paid'
        elif self.is_overdue and self.status == 'pending':
            self.status = 'overdue'
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.bill_number} - {self.user.username} - KSh {self.total_amount}"
    
    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == 'pending' and self.due_date < timezone.now().date()
    
    @property
    def balance_due(self):
        return max(self.total_amount - self.paid_amount, Decimal('0.00'))


class Payment(models.Model):
    """Payments - matches SRS payment processing"""
    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('card', 'Credit/Debit Card'),
        ('bank', 'Bank Transfer'),
        ('cash', 'Cash'),
    ]
    
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='payments')
    
    # Payment details
    transaction_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    payment_date = models.DateTimeField(auto_now_add=True)
    
    # Payment reference (e.g., M-Pesa code, bank ref)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # Gateway response (for simulation)
    gateway_response = models.JSONField(null=True, blank=True)
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_payments'
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-payment_date']
    
    def save(self, *args, **kwargs):
        # Generate transaction ID if not provided
        if not self.transaction_id:
            from django.utils import timezone
            import random
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            rand = random.randint(1000, 9999)
            self.transaction_id = f"TXN-{timestamp}-{rand}"
        
        super().save(*args, **kwargs)
        
        # Update bill's paid amount
        self.bill.paid_amount = self.bill.payments.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        self.bill.save()
    
    def __str__(self):
        return f"{self.transaction_id} - KSh {self.amount}"


class Notification(models.Model):
    """Notifications - matches SRS notification requirements"""
    NOTIFICATION_TYPE_CHOICES = [
        ('bill_generated', 'Bill Generated'),
        ('payment_due', 'Payment Due'),
        ('payment_received', 'Payment Received'),
        ('overdue', 'Payment Overdue'),
        ('anomaly', 'Usage Anomaly Detected'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Related objects
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, null=True, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, null=True, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    is_sent_email = models.BooleanField(default=False)
    is_sent_sms = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.user.username}"