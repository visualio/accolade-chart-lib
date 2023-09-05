import { isDefined } from './utils';
import { format, formatDefaultLocale } from 'd3';
import {Locale} from "./types";
import {FormatLocaleDefinition, FormatLocaleObject} from "d3-format";

const localeMap: Record<Locale, FormatLocaleDefinition> = {
    [Locale.CZECH]: {
        decimal: `,`,
        thousands: ` `,
        grouping: [3],
        currency: [``, ` Kč`],
    },
    [Locale.ENGLISH]: {
        decimal: `.`,
        thousands: `,`,
        grouping: [3],
        currency: [`£`, ``],
    },
};
export function createValueFormatter(
  decimalPlaces: number
): (n: number) => string {
  return isDefined(decimalPlaces) ? format(`,.${decimalPlaces}f`) : format(`,`);
}

export function setFormatLocale(locale: Locale): FormatLocaleObject {
  return formatDefaultLocale(localeMap[locale] || localeMap[Locale.CZECH]);
}
