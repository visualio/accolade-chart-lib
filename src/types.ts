type Row = {
  values: Record<string, string | number>;
  colors: string;
  name: string;
};

type Rows = Record<string, Row>;

type Col = {
  value: string;
  colors: string;
  annotation?: Array<Array<string | number>>;
  annotationWidth?: number;
};

type Cols = Record<string, Col>;

export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type RGBA = RGB & { a: number };

export type Color = {
  start: RGBA;
  end: RGBA;
  border: RGBA;
};

enum ChartType {
  LINE = `line`,
  BAR = `bar`,
  DOUGHNUT = `doughnut`,
  TABLE = `table`,
}

type Colors = Record<string, Color>;

enum Locale {
  CZECH = 'cs',
  ENGLISH = 'en',
}

enum SortType {
  ORIGINAL = `originalSort`,
  KEY = `keySort`,
  VALUE = `valueSort`,
}

enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export type Coordinates = {
  bottom: number;
  right: number;
  top: number;
  left: number;
};

export interface Settings {
  rows: Rows;
  cols: Cols;
  colors: Colors;
  chartType: ChartType;
  width: number;
  height: number;
  shouldDownloadVector: boolean;
  shouldDownloadRaster: boolean;
  verticalLabel: string;
  horizontalLabel: string;
  title: string;
  subtitle: string;
  unit: string;
  displayLegend: boolean;
  orientation: 'column';
  sortType: SortType;
  sortDirection: SortDirection;
  locale: Locale;
  decimalPlaces: number;
}
