export const getInitialsName = (fullName: string): string => {
  const words = fullName.split(" ");
  const initials = words
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
  return initials;
};
