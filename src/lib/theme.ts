type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

const buttonVariants = new Set<ButtonVariant>([
  "primary",
  "secondary",
  "outline",
  "ghost",
]);

export const getLabelClasses = (_theme?: string) =>
  "mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8F816C]";

export const getInputClasses = (className = "") =>
  `w-full rounded-[4px] border border-[#DCCFBC] bg-[#FFFDF9] px-4 py-3 text-sm text-[#2D241B] outline-none transition-colors duration-200 focus:border-[#31271F] ${className}`;

export const getButtonClasses = (
  themeOrVariant?: string,
  variantOrClassName: ButtonVariant | string = "primary",
  classNameMaybe = "",
) => {
  const base =
    "inline-flex items-center justify-center rounded-[8px] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const variant = buttonVariants.has(themeOrVariant as ButtonVariant)
    ? (themeOrVariant as ButtonVariant)
    : buttonVariants.has(variantOrClassName as ButtonVariant)
      ? (variantOrClassName as ButtonVariant)
      : "primary";
  const className = buttonVariants.has(themeOrVariant as ButtonVariant)
    ? (variantOrClassName as string)
    : classNameMaybe;

  if (variant === "primary")
    return `${base} bg-[#31271F] px-6 py-3 text-[#FBF8F3] hover:bg-[#241C16] ${className}`;
  if (variant === "secondary")
    return `${base} bg-[#EDE3D5] px-6 py-3 text-[#2D241B] hover:bg-[#E4D7C6] ${className}`;
  if (variant === "outline")
    return `${base} border border-[#DCCFBC] bg-white/72 px-6 py-3 text-[#2D241B] hover:bg-[#F3EBDE] ${className}`;
  return `${base} px-4 py-2 text-[#5F5549] hover:bg-[#EDE3D5] ${className}`;
};
