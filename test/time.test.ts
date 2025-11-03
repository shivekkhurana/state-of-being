import { expect, describe, it } from 'bun:test';
import {
  getCurrentDate,
  getWeekdaysInMonth,
  getMonthName,
  hasMonthPassed,
  getLastDayOfMonth,
  getPreviousMonthAndYear,
} from '@src/time';

describe('getCurrentDate', () => {
  it('should return a string in the format YYYY-MM-DD', () => {
    const currentDate = getCurrentDate();
    expect(currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getWeekdaysInMonth', () => {
  it('should return the number of weekdays in a given month and year', () => {
    const weekdaysInMonth = getWeekdaysInMonth(2023, 12);
    expect(weekdaysInMonth).toBeGreaterThanOrEqual(0);
    expect(weekdaysInMonth).toBeLessThanOrEqual(31);
  });
});

describe('getMonthName', () => {
  it('should return the name of the month for a given month number', () => {
    const monthName = getMonthName(1); // Example for month number 1 (January)
    expect(monthName).toBe('January');
  });

  it('should return "Invalid month number" for out-of-range month numbers', () => {
    const invalidMonthName = getMonthName(15); // Example for an invalid month number
    expect(invalidMonthName).toBe('Invalid month number');
  });
});

describe('hasMonthPassed', () => {
  it('should return true if the provided year and month have passed', () => {
    const monthPassed = hasMonthPassed(2023, 11);
    expect(monthPassed).toBe(true);
  });

  it('should return false if the provided year and month have not passed', () => {
    const monthNotPassed = hasMonthPassed(2100, 2);
    expect(monthNotPassed).toBe(false);
  });
});

describe('getLastDayOfMonth', () => {
  it('should return the last day of the month for a given year and month', () => {
    const lastDayOfMonth = getLastDayOfMonth(2023, 12);
    expect(lastDayOfMonth).toBe(31);
  });
});

describe('getPreviousMonthAndYear', () => {
  it('should return correct previous month and year for various inputs', () => {
    expect(getPreviousMonthAndYear(3, 2023)).toEqual({
      prevMonth: 2,
      prevYear: 2023,
    });

    expect(getPreviousMonthAndYear(1, 2023)).toEqual({
      prevMonth: 12,
      prevYear: 2022,
    });

    expect(getPreviousMonthAndYear(12, 2020)).toEqual({
      prevMonth: 11,
      prevYear: 2020,
    });
  });
});
