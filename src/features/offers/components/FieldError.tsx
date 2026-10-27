export const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-compact text-danger">{message}</p> : null
