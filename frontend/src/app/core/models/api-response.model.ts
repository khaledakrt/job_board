export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiFieldError[];
}

export interface ApiFieldError {
  field: string;
  message: string;
}
