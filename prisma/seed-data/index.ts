export { users } from "./users";
export { cycles } from "./cycles";
export { goalsPart1 } from "./goals-part1";
export { goalsPart2 } from "./goals-part2";
export { goalsPart3 } from "./goals-part3";
export { goalsExecutive } from "./goals-executive";
export * from "./types";

import { goalsPart1 } from "./goals-part1";
import { goalsPart2 } from "./goals-part2";
import { goalsPart3 } from "./goals-part3";
import { goalsExecutive } from "./goals-executive";

export const allGoals = [...goalsPart1, ...goalsPart2, ...goalsPart3, ...goalsExecutive];
