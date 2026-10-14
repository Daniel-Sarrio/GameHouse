export interface RespuestaApi<T> {
  success: true;
  data: T;
}

export interface RespuestaError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}
