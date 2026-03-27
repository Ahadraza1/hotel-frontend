import { City, Country, State } from "country-state-city";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+\d(?: ?\d)*$/;

const normalizeLocationValue = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const findCountry = (countryName: string) => {
  const normalizedCountry = normalizeLocationValue(countryName);
  return Country.getAllCountries().find(
    (country) =>
      normalizeLocationValue(country.name) === normalizedCountry ||
      country.isoCode.toLocaleLowerCase() === normalizedCountry,
  );
};

const findState = (countryName: string, stateName: string) => {
  const country = findCountry(countryName);
  if (!country) return null;

  const normalizedState = normalizeLocationValue(stateName);
  return (
    State.getStatesOfCountry(country.isoCode).find(
      (state) =>
        normalizeLocationValue(state.name) === normalizedState ||
        state.isoCode.toLocaleLowerCase() === normalizedState,
    ) || null
  );
};

const findCity = (countryName: string, stateName: string, cityName: string) => {
  const country = findCountry(countryName);
  const state = findState(countryName, stateName);

  if (!country || !state) return null;

  const normalizedCity = normalizeLocationValue(cityName);
  return (
    City.getCitiesOfState(country.isoCode, state.isoCode).find(
      (city) => normalizeLocationValue(city.name) === normalizedCity,
    ) || null
  );
};

export const validateEmailField = (value: string) =>
  EMAIL_REGEX.test(value.trim()) ? "" : "Please enter a valid email address";

export const validatePhoneField = (value: string) =>
  PHONE_REGEX.test(value.trim())
    ? ""
    : "Phone number must be numeric and include country code";

export const validateCountryField = (value: string) =>
  findCountry(value) ? "" : "This field should contain a valid country name";

export const validateStateField = (countryName: string, stateName: string) =>
  findState(countryName, stateName)
    ? ""
    : "This field should contain a valid state name";

export const validateCityField = (
  countryName: string,
  stateName: string,
  cityName: string,
) =>
  findCity(countryName, stateName, cityName)
    ? ""
    : "This field should contain a valid city name";
