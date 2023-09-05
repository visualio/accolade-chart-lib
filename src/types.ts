import { ScaleBand, ScaleLinear, Selection } from 'd3';

export type Dimensions = { x: number; width: number };

export type RowValues = Record<string, string | number>;

export type Row = {
  values: RowValues;
  colors: string;
  name: string;
};

export type Annotation = Array<Array<string | number>>

export type Rows = Record<string, Row>;

export type Col = {
  value: string;
  colors: string;
  annotation?: Annotation;
  annotationWidth?: number;
};

export type Cols = Record<string, Col>;

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

export enum ChartType {
  LINE = `line`,
  BAR = `bar`,
  DOUGHNUT = `doughnut`,
  TABLE = `table`,
}

export type Colors = Record<string, Color>;

export enum Locale {
  CZECH = 'cs',
  ENGLISH = 'en',
}

export enum SortType {
  ORIGINAL = `originalSort`,
  KEY = `keySort`,
  VALUE = `valueSort`,
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export type Coordinates = {
  bottom: number;
  right: number;
  top: number;
  left: number;
};

export interface Config {
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
  isTransposed?: boolean;
  tableTitle?: string
}

export type ColorDatum = [string, Color];
export type RowDatum = [string, Row];
export type ValueDatum = [string, string | number];

export type ChartLabels = {
  horizontalLabel: string;
  verticalLabel: string;
};

export type Chart = Selection<SVGGElement, any, any, any>;

export type Scales = {
  x: ScaleBand<string>;
  y: ScaleLinear<number, number>;
}

export type AnnotationData = [string, Annotation, number, number]