import { Slot } from "./slot";
import { cn } from "@/lib/utils";

const variants = {
  brand:
    "bg-brand text-white shadow-sm shadow-brand-start/20 hover:brightness-110 hover:shadow-md hover:shadow-brand-end/25",
  default: "bg-foreground text-background hover:opacity-90",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
  icon: "size-10 rounded-xl",
} as const;

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
};

export function Button({ className, variant = "default", size = "md", asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 font-medium whitespace-nowrap transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
