from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Only allow owners of an object to read it.
    """

    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user
