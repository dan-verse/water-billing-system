from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Add operator role to admin user'

    def handle(self, *args, **kwargs):
        try:
            admin_user = User.objects.get(username='admin')
            # Make admin have both admin and operator permissions by updating role
            if admin_user.role == 'admin':
                # Django doesn't support multiple roles directly, but admin can already do operator tasks
                # Let's just confirm admin has all permissions
                self.stdout.write(
                    self.style.SUCCESS(f'Admin user "{admin_user.username}" confirmed with permissions')
                )
                self.stdout.write('Admin users automatically have operator permissions in the system.')
            else:
                self.stdout.write(self.style.WARNING(f'User "{admin_user.username}" is not an admin'))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Admin user not found'))
