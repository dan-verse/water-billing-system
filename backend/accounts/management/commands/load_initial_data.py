from django.core.management.base import BaseCommand
from accounts.models import WaterRate, User
from decimal import Decimal
from datetime import date


class Command(BaseCommand):
    help = 'Load initial water rates and sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Loading water rates...')
        
        # Residential rates
        residential_rates = [
            {
                'rate_type': 'residential',
                'tier_name': 'First 10 m³ (Basic)',
                'tier_start': Decimal('0'),
                'tier_end': Decimal('10'),
                'price_per_unit': Decimal('30.00'),
            },
            {
                'rate_type': 'residential',
                'tier_name': '11-50 m³ (Standard)',
                'tier_start': Decimal('10'),
                'tier_end': Decimal('50'),
                'price_per_unit': Decimal('45.00'),
            },
            {
                'rate_type': 'residential',
                'tier_name': 'Above 50 m³ (High Usage)',
                'tier_start': Decimal('50'),
                'tier_end': None,
                'price_per_unit': Decimal('60.00'),
            },
        ]

        # Commercial rates
        commercial_rates = [
            {
                'rate_type': 'commercial',
                'tier_name': 'All Commercial Usage',
                'tier_start': Decimal('0'),
                'tier_end': None,
                'price_per_unit': Decimal('75.00'),
            },
        ]

        all_rates = residential_rates + commercial_rates

        for rate_data in all_rates:
            rate, created = WaterRate.objects.get_or_create(
                rate_type=rate_data['rate_type'],
                tier_start=rate_data['tier_start'],
                defaults={
                    **rate_data,
                    'effective_from': date.today(),
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created rate: {rate.tier_name}')
                )
            else:
                self.stdout.write(f'Rate already exists: {rate.tier_name}')

        self.stdout.write(self.style.SUCCESS('Water rates loaded successfully!'))
        
        # Optionally create sample users
        self.stdout.write('\nCreating sample users...')
        
        sample_users = [
            {
                'username': 'customer1',
                'email': 'customer1@example.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'role': 'customer',
                'meter_number': 'MTR001',
                'phone_number': '+254712345678',
                'address': '123 Main Street, Nairobi',
            },
            {
                'username': 'operator1',
                'email': 'operator@mbugua.com',
                'first_name': 'Jane',
                'last_name': 'Smith',
                'role': 'operator',
                'phone_number': '+254787654321',
                'address': 'Mbugua Water Services Office',
            },
        ]

        for user_data in sample_users:
            if not User.objects.filter(username=user_data['username']).exists():
                user = User.objects.create_user(
                    password='password123',  # Change in production!
                    **user_data
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Created user: {user.username}')
                )
            else:
                self.stdout.write(f'User already exists: {user_data["username"]}')

        self.stdout.write(self.style.SUCCESS('\n✅ Initial data loaded successfully!'))
        self.stdout.write('\nDefault credentials:')
        self.stdout.write('  Admin: Use createsuperuser command')
        self.stdout.write('  Customer: customer1 / password123')
        self.stdout.write('  Operator: operator1 / password123')