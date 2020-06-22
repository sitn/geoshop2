export interface IApiResponse<T> {
  /**
   * Number of item found
   */
  count: number;
  /**
   * The url of next items
   */
  next: string;
  /**
   * The url of previous items
   */
  previous: string;
  /**
   * Array of items
   */
  results: Array<T>;
}

export interface IApiResponseError {
  error: { detail: string; };
  message: string;
  name: string;
  status: number;
}
