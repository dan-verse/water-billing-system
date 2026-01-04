from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MeterReading, Bill, Payment, WaterRate, Notification

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """User serializer with role-based fields"""
    outstanding_balance = serializers.ReadOnlyField()
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'address', 'meter_number', 'role',
            'is_active_customer', 'registration_date', 'outstanding_balance',
            'password', 'password_confirm'
        ]
        read_only_fields = ['id', 'registration_date', 'outstanding_balance']
    
    def validate(self, data):
        """Validate password confirmation"""
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        
        if password and password != password_confirm:
            raise serializers.ValidationError("Passwords don't match")
        
        return data
    
    def create(self, validated_data):
        """Create user with password hashing and ensure is_active is True"""
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password', None)
        # Ensure the user is active by default
        validated_data['is_active'] = True
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        """Update user with password hashing if provided"""
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Registration serializer with password handling"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number', 'address', 'role'
        ]
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class WaterRateSerializer(serializers.ModelSerializer):
    """Water rate serializer"""
    class Meta:
        model = WaterRate
        fields = '__all__'


class MeterReadingSerializer(serializers.ModelSerializer):
    """Meter reading serializer with nested user info"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    consumption = serializers.ReadOnlyField()
    
    class Meta:
        model = MeterReading
        fields = [
            'id', 'user', 'user_name', 'reading_date',
            'previous_reading', 'current_reading', 'consumption',
            'billing_period_start', 'billing_period_end',
            'reading_type', 'recorded_by', 'recorded_by_name',
            'is_anomaly', 'anomaly_reason', 'notes', 'created_at'
        ]
        read_only_fields = ['consumption', 'is_anomaly', 'anomaly_reason']


class BillSerializer(serializers.ModelSerializer):
    """Bill serializer with calculated fields"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    meter_reading_details = MeterReadingSerializer(source='meter_reading', read_only=True)
    balance_due = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = Bill
        fields = [
            'id', 'user', 'user_name', 'meter_reading', 'meter_reading_details',
            'bill_number', 'issue_date', 'due_date',
            'consumption_charge', 'base_charge', 'tax_amount',
            'late_fee', 'discount', 'total_amount',
            'status', 'paid_amount', 'balance_due', 'payment_date',
            'is_overdue', 'notes', 'created_at'
        ]
        read_only_fields = ['bill_number', 'issue_date', 'total_amount', 'balance_due', 'is_overdue', 'created_at', 'consumption_charge', 'tax_amount', 'late_fee', 'paid_amount', 'status', 'payment_date']


class PaymentSerializer(serializers.ModelSerializer):
    """Payment serializer"""
    bill_number = serializers.CharField(source='bill.bill_number', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'bill', 'bill_number', 'transaction_id',
            'amount', 'payment_method', 'payment_method_display',
            'payment_reference', 'payment_date', 'is_verified',
            'gateway_response', 'notes', 'created_at'
        ]
        read_only_fields = ['transaction_id', 'payment_date']


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'notification_type_display',
            'title', 'message', 'bill', 'payment',
            'is_read', 'created_at'
        ]
        read_only_fields = ['created_at']


class BillingSummarySerializer(serializers.Serializer):
    """Custom serializer for dashboard statistics"""
    total_bills = serializers.IntegerField()
    pending_bills = serializers.IntegerField()
    paid_bills = serializers.IntegerField()
    overdue_bills = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_customers = serializers.IntegerField()
    active_customers = serializers.IntegerField()