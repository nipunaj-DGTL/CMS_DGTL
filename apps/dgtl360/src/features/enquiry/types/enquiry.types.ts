export type EnquiryPayload = {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  website: string;
};

export type EnquiryValidationResult =
  | { success: true; data: EnquiryPayload }
  | { success: false; message: string };
