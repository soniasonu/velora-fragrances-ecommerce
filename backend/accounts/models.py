# Authentication uses Django's built-in User model (django.contrib.auth.models.User).
# Email is stored in User.email and also copied into User.username, since Django's
# default User requires a unique username — this lets people log in with just
# their email without needing a custom User model.
#
# If you later want extra profile fields (phone number, shipping address, etc.),
# add a Profile model here with a OneToOneField to User.
