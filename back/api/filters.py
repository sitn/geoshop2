import re
import unidecode

from django.contrib.postgres.search import SearchQuery
from django.utils.encoding import force_str
from django.utils.translation import gettext_lazy as _

from rest_framework.compat import coreapi, coreschema
from rest_framework.filters import BaseFilterBackend
from rest_framework.settings import api_settings


class FullTextSearchFilter(BaseFilterBackend):
    """
    A custom filter that allow ts vector partial search
    """
    search_param = api_settings.SEARCH_PARAM
    template = 'rest_framework/filters/search.html'
    search_title = _('Search')
    search_description = _('A search term.')


    def get_ts_field(self, view, request):
        """
        Search field is obtained from the view, but the request is always
        passed to this method.
        """
        return getattr(view, 'ts_field', None)


    # Courtesy of
    # https://www.fusionbox.com/blog/detail/partial-word-search-with-postgres-full-text-search-in-django/632/
    def get_search_term(self, request):
        """
        Search term is set by a ?search=... query parameter.
        This sanitizes the term so it can be passed to database.
        """
        term = request.query_params.get(self.search_param, '')
        term = term.replace('\x00', '')  # strip null characters
        term = re.sub(r'[!\'()|&:]', ' ', term).strip()
        term = unidecode.unidecode(term)
        if term:
            term = re.sub(r'\s+', ' & ', term)
            # Support prefix search on the last word. A tsquery of 'toda:*' will
            # match against any words that start with 'toda', which is good for
            # search-as-you-type.
            term += ':*'
        return term


    def filter_queryset(self, request, queryset, view):
        """
        Return a filtered queryset using ts_vector field.
        """
        ts_field = self.get_ts_field(view, request)
        search_term = self.get_search_term(request)

        if not ts_field or not search_term:
            return queryset

        search_query = SearchQuery(search_term, search_type='raw')

        kwargs = {ts_field: search_query}
        queryset = queryset.filter(**kwargs)
        return queryset


    # Copied from rest_framework.filters.SearchFilter
    def get_schema_fields(self, view):
        assert coreapi is not None, 'coreapi must be installed to use `get_schema_fields()`'
        assert coreschema is not None, 'coreschema must be installed to use `get_schema_fields()`'
        return [
            coreapi.Field(
                name=self.search_param,
                required=False,
                location='query',
                schema=coreschema.String(
                    title=force_str(self.search_title),
                    description=force_str(self.search_description)
                )
            )
        ]


    # Copied from rest_framework.filters.SearchFilter
    def get_schema_operation_parameters(self, view):
        return [
            {
                'name': self.search_param,
                'required': False,
                'in': 'query',
                'description': force_str(self.search_description),
                'schema': {
                    'type': 'string',
                },
            },
        ]
