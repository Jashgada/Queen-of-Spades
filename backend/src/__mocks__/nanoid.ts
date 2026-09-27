let sequence = 0;

export const nanoid = (size = 8) => {
  sequence += 1;
  return sequence.toString().padStart(size, '0').slice(-size);
};
