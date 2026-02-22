export type Address = {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string | null;
  postalCode: string;
  isDefault: boolean;
};
