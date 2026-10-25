from django.urls import path
from api.views import auth, products, movements, users, profile, reports, nfe, barcode, notificacoes, recuperacao

urlpatterns = [
    # Auth
    path('auth/register', auth.register),
    path('auth/login', auth.login),
    path('auth/recuperacao/buscar', recuperacao.buscar),
    path('auth/recuperacao/enviar-codigo', recuperacao.enviar_codigo),
    path('auth/recuperacao/verificar-codigo', recuperacao.verificar_codigo),
    path('auth/recuperacao/redefinir-senha', recuperacao.redefinir_senha),

    # Products
    path('products', products.products_list_create),
    path('products/barcode/<str:codigo>', barcode.get_barcode_product),
    path('products/<int:pk>', products.product_detail),
    path('products/<int:pk>/withdraw', products.product_withdraw),
    path('products/<int:pk>/entry', products.product_entry),
    path('products/<int:pk>/archive', products.product_archive),
    path('products/<int:pk>/restore', products.product_restore),

    # Movements
    path('movements', movements.list_movements),
    path('movements/users', movements.list_movement_users),

    # NF-e
    path('nfe/xml', nfe.parse_nfe),

    # Reports
    path('reports', reports.get_report),

    # Users / team
    path('users', users.users_list_create),
    path('users/<int:pk>/role', users.update_user_role),
    path('users/<int:pk>/status', users.toggle_user_status),
    path('users/<int:pk>', users.delete_user),

    # Profile
    path('profile', profile.profile),
    path('profile/email-recuperacao', profile.update_email_recuperacao),

    # Notificações
    path('notificacoes', notificacoes.listar),
    path('notificacoes/marcar-lidas', notificacoes.marcar_lidas),
    path('notificacoes/<int:pk>/dispensar', notificacoes.dispensar),
]
