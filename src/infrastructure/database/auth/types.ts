export interface ISignupRequest {
  email: string;
  phone: string;
  password: string;
}

export interface ISignupResponse {
  user: {
    id: string;
    email: string;
    phone: string;
  };
  message: string;
}

export interface IProfile {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'User';
  created_at: string;
}
