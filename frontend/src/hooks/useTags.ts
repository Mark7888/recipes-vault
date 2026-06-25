import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../api/tags.api';

export function useTags(search: string) {
  return useQuery({
    queryKey: ['tags', search],
    queryFn: () => tagsApi.search(search),
    enabled: search.length > 0,
    staleTime: 30_000,
  });
}
