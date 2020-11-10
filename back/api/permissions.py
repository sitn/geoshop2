from rest_framework import permissions


class ExtractGroupPermission(permissions.BasePermission):
    """
    Only allow users that are in a group named `extract`
    """

    def has_permission(self, request, view):
        queryset = request.user.groups.values_list('name', flat=True)
        return 'extract' in list(queryset)
