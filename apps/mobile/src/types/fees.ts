export type FeeStructure =
  | { type: 'flat'; valueCents: number }
  | { type: 'percent'; valuePercent: number };

export type RestaurantFees = {
  pickupFee: FeeStructure;
  deliveryFee: FeeStructure;
};
