export function getCourseAspectClass(ratio?: string): string {
  switch (ratio) {
    case "16:9":
      return "aspect-[16/9]";
    case "4:3":
      return "aspect-[4/3]";
    case "3:4":
      return "aspect-[3/4]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-[16/9]";
  }
}
