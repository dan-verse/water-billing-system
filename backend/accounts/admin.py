from django.contrib import admin
from django.utils.html import format_html
from .models import User, WaterRate, MeterReading, Bill, Payment, Notification


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'phone_number', 'is_active', 'registration_date')
    list_filter = ('role', 'is_active_customer', 'registration_date')
    search_fields = ('username', 'email', 'phone_number', 'meter_number')
    fieldsets = (
        ('Authentication', {'fields': ('username', 'password', 'email')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone_number', 'address')}),
        ('Account Settings', {'fields': ('role', 'meter_number', 'is_active_customer')}),
        ('Timestamps', {'fields': ('registration_date', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    readonly_fields = ('registration_date', 'created_at', 'updated_at')


@admin.register(WaterRate)
class WaterRateAdmin(admin.ModelAdmin):
    list_display = ('rate_type', 'tier_name', 'tier_start', 'tier_end', 'price_per_unit', 'is_active')
    list_filter = ('rate_type', 'is_active', 'effective_from')
    ordering = ('rate_type', 'tier_start')
    fieldsets = (
        ('Tier Information', {'fields': ('rate_type', 'tier_name', 'tier_start', 'tier_end')}),
        ('Pricing', {'fields': ('price_per_unit',)}),
        ('Effective Period', {'fields': ('effective_from', 'effective_to', 'is_active')}),
    )


@admin.register(MeterReading)
class MeterReadingAdmin(admin.ModelAdmin):
    list_display = ('get_customer', 'reading_date', 'consumption', 'is_anomaly', 'created_at')
    list_filter = ('reading_date', 'is_anomaly', 'reading_type')
    search_fields = ('user__username', 'user__meter_number')
    readonly_fields = ('consumption', 'is_anomaly', 'anomaly_reason', 'created_at')
    fieldsets = (
        ('Customer & Reading', {'fields': ('user', 'reading_date', 'recorded_by')}),
        ('Meter Data', {'fields': ('previous_reading', 'current_reading', 'consumption')}),
        ('Billing Period', {'fields': ('billing_period_start', 'billing_period_end')}),
        ('Reading Metadata', {'fields': ('reading_type', 'notes')}),
        ('Anomaly Detection', {'fields': ('is_anomaly', 'anomaly_reason'), 'classes': ('collapse',)}),
    )
    
    def get_customer(self, obj):
        return f"{obj.user.get_full_name()} ({obj.user.meter_number})"
    get_customer.short_description = 'Customer'


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('bill_number', 'get_customer', 'total_amount', 'status', 'issue_date', 'due_date')
    list_filter = ('status', 'issue_date', 'due_date')
    search_fields = ('bill_number', 'user__username', 'user__meter_number')
    readonly_fields = ('bill_number', 'total_amount', 'created_at', 'updated_at')
    fieldsets = (
        ('Bill Information', {'fields': ('bill_number', 'user', 'meter_reading', 'status')}),
        ('Dates', {'fields': ('issue_date', 'due_date', 'payment_date')}),
        ('Charges Breakdown', {
            'fields': ('consumption_charge', 'base_charge', 'tax_amount', 'late_fee', 'discount', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Payment Tracking', {'fields': ('paid_amount', 'notes')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    
    def get_customer(self, obj):
        return f"{obj.user.get_full_name()} ({obj.user.meter_number})"
    get_customer.short_description = 'Customer'
    
    def colored_status(self, obj):
        colors = {
            'pending': '#FFC107',
            'paid': '#28A745',
            'overdue': '#DC3545',
            'partially_paid': '#17A2B8',
            'cancelled': '#6C757D'
        }
        color = colors.get(obj.status, '#FFFFFF')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    colored_status.short_description = 'Status'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'get_bill_number', 'amount', 'payment_method', 'payment_date', 'is_verified')
    list_filter = ('payment_method', 'payment_date', 'is_verified')
    search_fields = ('transaction_id', 'bill__bill_number', 'bill__user__username')
    readonly_fields = ('transaction_id', 'payment_date', 'created_at', 'gateway_response')
    fieldsets = (
        ('Payment Details', {'fields': ('bill', 'transaction_id', 'amount', 'payment_method')}),
        ('Payment Reference', {'fields': ('payment_reference', 'payment_date')}),
        ('Gateway Response', {'fields': ('gateway_response',), 'classes': ('collapse',)}),
        ('Verification', {'fields': ('is_verified', 'verified_by')}),
        ('Notes', {'fields': ('notes',)}),
    )
    
    def get_bill_number(self, obj):
        return obj.bill.bill_number
    get_bill_number.short_description = 'Bill Number'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_type', 'get_user', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'message')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Notification', {'fields': ('user', 'notification_type', 'title', 'message')}),
        ('Related Objects', {'fields': ('bill', 'payment')}),
        ('Status', {'fields': ('is_read', 'is_sent_email', 'is_sent_sms')}),
    )
    
    def get_user(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_user.short_description = 'User'
