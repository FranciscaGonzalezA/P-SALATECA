export type ScreeningTitleClassification =
  | {
      kind: 'movie';
      title: string;
    }
  | {
      kind: 'activity';
      title: string;
    };
export declare function classifyScreeningTitle(value: string): ScreeningTitleClassification;
