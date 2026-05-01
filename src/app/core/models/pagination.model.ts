export interface PaginatedResponse<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  records: number;
  pages: number;
}
