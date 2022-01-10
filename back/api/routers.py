from collections import OrderedDict

from rest_framework.routers import DefaultRouter


class GeoshopRouter(DefaultRouter):
    """
    Extension of DefaultRouter to add more urls to Root
    """
    additional_root_dict = OrderedDict()

    def get_api_root_view(self, api_urls=None):
        """
        Return a basic root view.
        """
        api_root_dict = OrderedDict()
        list_name = self.routes[0].name
        for prefix, viewset, basename in self.registry:
            api_root_dict[prefix] = list_name.format(basename=basename)

        complete_root_dict = {**api_root_dict, **self.additional_root_dict}
        return self.APIRootView.as_view(api_root_dict=complete_root_dict)

    def register_additional_route_to_root(self, path, view_name):
        """
        Allows to add more routes to DefaultApiRoot
        """
        self.additional_root_dict[path] = view_name
