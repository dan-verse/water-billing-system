from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal

from .models import MeterReading, Bill, Payment, WaterRate, Notification
from .serializers import (
    UserSerializer, UserRegistrationSerializer,
    MeterReadingSerializer, BillSerializer, PaymentSerializer,
    WaterRateSerializer, NotificationSerializer, BillingSummarySerializer
)
from billing.utils import calculate_bill_from_reading, process_payment

User = get_user_model()


class IsAdminOrReadOnly(permissions.BasePermission):
    """Custom permission: Admins can modify, others read-only"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'operator']


class UserViewSet(viewsets.ModelViewSet):
    """User management viewset with full CRUD"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter users based on role"""
        user = self.request.user
        # Admins and operators can access all customers; customers can only access their own profile
        if user.role in ['admin', 'operator']:
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    def get_permissions(self):
        """Allow public registration"""
        if self.action == 'register':
            return [permissions.AllowAny()]
        return super().get_permissions()
    
    def check_permissions(self, request):
        """Check if user has permission to perform the action"""
        super().check_permissions(request)
        
        # Admin and operator can create/delete users
        if self.action in ['create', 'destroy']:
            if request.user.role not in ['admin', 'operator']:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only admins or operators can create or delete users")
    
    def check_object_permissions(self, request, obj):
        """Check object-level permissions"""
        super().check_object_permissions(request, obj)
        
        if request.method in ['PUT', 'PATCH'] and request.user.role not in ['admin', 'operator']:
            # Customers can only update themselves
            if obj.id != request.user.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only update your own profile")
    
    def perform_create(self, serializer):
        """Ensure created user is a customer if created by admin/operator"""
        if self.request.user.role in ['admin', 'operator']:
            serializer.save(role='customer')
        else:
            serializer.save()
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Public registration endpoint"""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def bills(self, request, pk=None):
        """Get user's bills"""
        user = self.get_object()
        bills = Bill.objects.filter(user=user)
        serializer = BillSerializer(bills, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def customers(self, request):
        """Get all customers (admin and operator only)"""
        # Allow admin and operator roles to access customers
        if request.user.role not in ['admin', 'operator']:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        customers = User.objects.filter(role='customer')
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)


class MeterReadingViewSet(viewsets.ModelViewSet):
    """Meter reading management with full CRUD"""
    queryset = MeterReading.objects.all()
    serializer_class = MeterReadingSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    
    def get_queryset(self):
        user = self.request.user
        queryset = MeterReading.objects.all()
        
        if user.role not in ['admin', 'operator']:
            queryset = queryset.filter(user=user)
        
        # Filter by user_id if provided
        user_id = self.request.query_params.get('user_id', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.select_related('user', 'recorded_by')
    
    def perform_create(self, serializer):
        """Auto-set recorded_by to current user"""
        serializer.save(recorded_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def generate_bill(self, request, pk=None):
        """Generate bill from meter reading"""
        reading = self.get_object()
        
        # Check if bill already exists
        if hasattr(reading, 'bill'):
            return Response(
                {'error': 'Bill already exists for this reading'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bill = calculate_bill_from_reading(reading)
            return Response(
                BillSerializer(bill).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def anomalies(self, request):
        """Get all anomalous readings"""
        anomalies = self.get_queryset().filter(is_anomaly=True)
        serializer = self.get_serializer(anomalies, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest reading for each customer"""
        if request.user.role not in ['admin', 'operator']:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        latest_readings = []
        customers = User.objects.filter(role='customer')
        
        for customer in customers:
            reading = MeterReading.objects.filter(user=customer).order_by('-reading_date').first()
            if reading:
                latest_readings.append(reading)
        
        serializer = self.get_serializer(latest_readings, many=True)
        return Response(serializer.data)


class BillViewSet(viewsets.ModelViewSet):
    """Bill management with full CRUD"""
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Bill.objects.all()
        
        if user.role not in ['admin', 'operator']:
            queryset = queryset.filter(user=user)
        
        # Filters
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        user_id = self.request.query_params.get('user_id', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.select_related('user', 'meter_reading').order_by('-issue_date')
    
    def get_permissions(self):
        """Only admin/operator can create/update/delete"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminOrReadOnly()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending bills"""
        bills = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(bills, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue bills"""
        bills = self.get_queryset().filter(
            status='pending',
            due_date__lt=timezone.now().date()
        )
        serializer = self.get_serializer(bills, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def apply_late_fee(self, request, pk=None):
        """Apply late fee to overdue bill"""
        bill = self.get_object()
        
        if not bill.is_overdue:
            return Response(
                {'error': 'Bill is not overdue'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 5% late fee or minimum KSh 50
        late_fee = max(bill.total_amount * Decimal('0.05'), Decimal('50.00'))
        bill.late_fee = late_fee
        bill.status = 'overdue'
        bill.save()
        
        return Response(self.get_serializer(bill).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a bill"""
        if request.user.role not in ['admin']:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        bill = self.get_object()
        bill.status = 'cancelled'
        bill.save()
        
        return Response(self.get_serializer(bill).data)


class PaymentViewSet(viewsets.ModelViewSet):
    """Payment management with full CRUD"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.all()
        
        if user.role not in ['admin', 'operator']:
            queryset = queryset.filter(bill__user=user)
        
        # Filter by bill_id
        bill_id = self.request.query_params.get('bill_id', None)
        if bill_id:
            queryset = queryset.filter(bill_id=bill_id)
        
        return queryset.select_related('bill', 'bill__user').order_by('-payment_date')
    
    def create(self, request, *args, **kwargs):
        """Process payment with business logic"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Use utility function to process payment
            payment = process_payment(
                bill_id=serializer.validated_data['bill'].id,
                amount=serializer.validated_data['amount'],
                payment_method=serializer.validated_data['payment_method'],
                payment_reference=serializer.validated_data.get('payment_reference', '')
            )
            
            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify payment (admin only)"""
        if request.user.role not in ['admin', 'operator']:
            return Response(
                {'error': 'Admin/Operator access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        payment = self.get_object()
        payment.is_verified = True
        payment.verified_by = request.user
        payment.save()
        
        return Response(self.get_serializer(payment).data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent payments"""
        payments = self.get_queryset()[:10]
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)


class WaterRateViewSet(viewsets.ModelViewSet):
    """Water rate management"""
    queryset = WaterRate.objects.filter(is_active=True)
    serializer_class = WaterRateSerializer
    permission_classes = [permissions.AllowAny]  # Public access for rates
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get currently active rates"""
        today = timezone.now().date()
        rates = WaterRate.objects.filter(
            is_active=True,
            effective_from__lte=today
        ).filter(
            Q(effective_to__gte=today) | Q(effective_to__isnull=True)
        ).order_by('rate_type', 'tier_start')
        serializer = self.get_serializer(rates, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """Notification management"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        unread = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(self.get_serializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'All notifications marked as read'})


class DashboardViewSet(viewsets.ViewSet):
    """Dashboard statistics and analytics"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get billing summary statistics"""
        user = request.user
        
        if user.role in ['admin', 'operator']:
            # Admin/Operator dashboard
            bills = Bill.objects.all()
            customers = User.objects.filter(role='customer')
        else:
            # Customer dashboard
            bills = Bill.objects.filter(user=user)
            customers = User.objects.filter(id=user.id)
        
        summary = {
            'total_bills': bills.count(),
            'pending_bills': bills.filter(status='pending').count(),
            'paid_bills': bills.filter(status='paid').count(),
            'overdue_bills': bills.filter(
                status='pending',
                due_date__lt=timezone.now().date()
            ).count(),
            'total_revenue': bills.filter(status='paid').aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00'),
            'pending_revenue': bills.filter(status='pending').aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00'),
            'total_customers': customers.count(),
            'active_customers': customers.filter(is_active_customer=True).count(),
        }
        
        serializer = BillingSummarySerializer(summary)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        """Get recent bills and payments"""
        user = request.user
        
        if user.role in ['admin', 'operator']:
            recent_bills = Bill.objects.all()[:10]
            recent_payments = Payment.objects.all()[:10]
        else:
            recent_bills = Bill.objects.filter(user=user)[:10]
            recent_payments = Payment.objects.filter(bill__user=user)[:10]
        
        return Response({
            'bills': BillSerializer(recent_bills, many=True).data,
            'payments': PaymentSerializer(recent_payments, many=True).data,
        })
    
    @action(detail=False, methods=['get'])
    def usage_analytics(self, request):
        """Get usage analytics (last 6 months)"""
        user = request.user
        
        if user.role == 'customer':
            readings = MeterReading.objects.filter(
                user=user,
                reading_date__gte=date.today() - timedelta(days=180)
            ).order_by('reading_date')
        else:
            readings = MeterReading.objects.filter(
                reading_date__gte=date.today() - timedelta(days=180)
            ).order_by('reading_date')
        
        # Group by month
        monthly_data = {}
        for reading in readings:
            month_key = reading.reading_date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'month': reading.reading_date.strftime('%b %Y'),
                    'total_consumption': 0,
                    'count': 0
                }
            monthly_data[month_key]['total_consumption'] += float(reading.consumption)
            monthly_data[month_key]['count'] += 1
        
        # Calculate averages
        analytics = []
        for month_key, data in sorted(monthly_data.items()):
            analytics.append({
                'month': data['month'],
                'average_consumption': data['total_consumption'] / data['count'] if data['count'] > 0 else 0,
                'total_consumption': data['total_consumption']
            })
        
        return Response(analytics)