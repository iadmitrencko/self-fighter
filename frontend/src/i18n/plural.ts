// Ukrainian has three forms for whole numbers: 1 раунд, 2 раунди, 5 раундів.
export interface PluralForms {
  readonly one: string;
  readonly few: string;
  readonly many: string;
}

const rules = new Intl.PluralRules('uk');

// {n} in a form is replaced with the number.
export function plural(count: number, forms: PluralForms): string {
  const category = rules.select(count);
  const form = category === 'one' || category === 'few' ? forms[category] : forms.many;

  return form.replace('{n}', String(count));
}
