from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'meter-readings', views.MeterReadingViewSet)
router.register(r'bills', views.BillViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'rates', views.WaterRateViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]