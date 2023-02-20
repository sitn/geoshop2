from rest_framework import permissions


class ExtractGroupPermission(permissions.BasePermission):
    """
    Only allow users that are in a group named `extract`
    """

    def has_permission(self, request, view):
        queryset = request.user.groups.values_list('name', flat=True)
        return 'extract' in list(queryset)

class InternalGroupObjectPermission(permissions.BasePermission):
    """
    Object-level permission to only allow users belonging to internal group
    to access objects that have an `INTERNAL` accessibility.
    """

    def has_object_permission(self, request, view, obj):
        if obj.accessibility in ['PUBLIC', 'APPROVAL_NEEDED']:
            return True
        if request.user.has_perm('api.view_internal'):
            return True
        return False
