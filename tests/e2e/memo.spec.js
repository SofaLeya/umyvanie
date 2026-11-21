const {test,expect}=require('@playwright/test');
const recommendations=[
 'Первые 3 недели адапален через день, потом каждый вечер, если кожа спокойная. Если раздражена, включи переключатель вверху.',
 'Если щёки шелушатся, включи режим для щёк: лоб и нос каждый раз, щёки 2–3 раза в неделю.',
 'Вечером без SaliZink, кислот и скрабов.',
 'Первые 2–4 недели может быть обострение, это нормально. Результат через 2–3 месяца.',
 'Галочки сбрасываются каждый день в 5 утра.'
];
async function more(page){await page.goto('/');await page.locator('.bottom-nav [data-tab=more]').click()}
test('memo starts collapsed and reveals every original recommendation in groups',async({page})=>{
 await more(page);const memo=page.locator('#care-memo');await expect(memo).not.toHaveAttribute('open');
 await expect(memo.locator('summary')).toContainText('Памятка по уходу');
 await expect(memo.locator('summary')).toContainText('Адапален, шелушение и правила ухода');
 await expect(memo.locator('.memo-content')).toBeHidden();
 await memo.locator('summary').click();await expect(memo).toHaveAttribute('open');
 for(const text of recommendations)await expect(memo.getByText(text,{exact:true})).toBeVisible();
 await expect(memo.locator('.memo-group h3')).toHaveText(['Курс адапалена','Шелушение и чувствительность','Ежедневный уход']);
 await expect(memo.locator('.memo-group li')).toHaveCount(recommendations.length);
 await expect.poll(()=>memo.locator('.memo-arrow').evaluate(x=>getComputedStyle(x).transform)).not.toBe('none');
 await memo.locator('summary').click();await expect(memo).not.toHaveAttribute('open');await expect(memo.locator('.memo-content')).toBeHidden();
});
test('reduced motion keeps memo usable without an opening animation',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await more(page);const memo=page.locator('#care-memo');await memo.locator('summary').click();await expect(memo).toHaveAttribute('open');await expect(memo.locator('.memo-content')).toBeVisible();expect(await memo.locator('.memo-content').evaluate(x=>x.getAnimations().length)).toBe(0);await memo.locator('summary').click();await expect(memo).not.toHaveAttribute('open')});
for(const width of [320,360,390])test(`memo and settings fit ${width}px in both themes`,async({page})=>{await page.setViewportSize({width,height:720});await more(page);for(const theme of ['light','dark']){await page.locator('#theme-select').selectOption(theme);await expect(page.locator('#care-memo')).toBeVisible();await expect(page.locator('#calm-toggle')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.locator('#care-memo summary').click();await expect(page.locator('#care-memo .memo-content')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.locator('#care-memo summary').click();await expect(page.locator('#care-memo')).not.toHaveAttribute('open')}});
test('reset, step editor, backup and Yandex panel remain available below memo',async({page})=>{await more(page);await expect(page.locator('#reset')).toBeVisible();await expect(page.locator('#restart')).toBeVisible();await expect(page.locator('.edbox summary')).toBeVisible();await expect(page.locator('#bk-save')).toBeVisible();await expect(page.locator('.ydsync-box')).toBeVisible()});
