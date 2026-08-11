import type { ArticleFaq } from './types'

export interface Topic {
  /** URL segment — lives at /articles/topic/<id> */
  id: string
  /** Page <h1> */
  title: string
  /** SEO <title> (the " | Platizio Global" suffix is added by the SEO component) */
  seoTitle: string
  /** Meta description */
  description: string
  /** Single line shown under the h1 */
  blurb: string
  /** Genuine intro copy so the hub is not a thin list page */
  introHtml: string
  /** Rendered on-page and emitted as FAQPage JSON-LD */
  faqs: ArticleFaq[]
}

export const TOPICS: Topic[] = [
  {
    id: 'us-stocks',
    title: 'Investing in US Stocks from India',
    seoTitle: 'Investing in US Stocks from India — Complete Guide',
    description:
      'How Indian residents invest in US stocks: the LRS route, account opening, fractional shares, costs, safety and regulation, and how US equities compare with Indian ones.',
    blurb:
      'Everything an Indian investor needs to buy US-listed shares — the legal route, the practical steps, the real costs.',
    introHtml: `
      <p>Indian residents can legally own shares in US-listed companies. The route runs through the Reserve Bank of India's <strong>Liberalised Remittance Scheme (LRS)</strong>, which permits remittances of up to USD 250,000 per individual per financial year for permitted purposes, including overseas equity investment.</p>
      <p>What tends to stop people is not the legality but the mechanics: which account holds the shares, how rupees become dollars, what the true cost of a trade is once forex markup and TCS are counted, and what happens to the holding if something goes wrong at the broker. Fractional shares change the arithmetic too — a share trading at USD 600 is no longer out of reach for someone investing ₹5,000 a month.</p>
      <p>The articles below work through each of those in turn, starting with the end-to-end process and then going deeper on the questions that come up once money is actually moving.</p>
    `,
    faqs: [
      {
        q: 'Can an Indian resident legally buy US stocks?',
        a: "Yes. Indian residents can invest in US-listed stocks and ETFs under the Reserve Bank of India's Liberalised Remittance Scheme (LRS), which permits remittances of up to USD 250,000 per individual per financial year for permitted purposes, including overseas equity investment.",
      },
      {
        q: 'How much money do I need to start investing in US stocks?',
        a: 'Because fractional shares are supported, the share price is no longer the constraint — you can invest a fixed rupee amount even in a high-priced stock. The practical floor is set by remittance costs rather than share prices, so it usually makes sense to remit in less frequent, larger tranches than to send small amounts often.',
      },
      {
        q: 'Where are my US shares actually held?',
        a: "Securities are custodised in the name of ViewTrade IFSC with DTCC for the benefit of customers — shares are held in ViewTrade IFSC's name, not the customer's, to protect clients under US regulations. The ownership and benefit of the account still belong to you as the end client. This is an IFSC-regulated account, not a standard US brokerage account.",
      },
      {
        q: 'Are my US investments protected if the broker fails?',
        a: 'US brokerage accounts are covered by SIPC (the Securities Investor Protection Corporation) up to USD 500,000 in total, including up to USD 250,000 for cash. SIPC protects against the failure of a brokerage firm; it does not protect against a fall in the market value of your investments.',
      },
      {
        q: 'Do I have to choose between Indian and US stocks?',
        a: 'No. The two are usually held together rather than as alternatives. Indian and US markets differ in sector composition and are driven by different economic cycles, which is the basis of the diversification argument for holding both.',
      },
    ],
  },

  {
    id: 'taxation',
    title: 'Tax on US Stocks and Global Investments',
    seoTitle: 'Tax on US Stocks in India — Capital Gains, Dividends, DTAA & Reporting',
    description:
      'How US stocks are taxed for Indian investors: LTCG and STCG rates, the 24-month holding period, dividend withholding, DTAA relief, TCS on LRS, Schedule FA and US estate tax.',
    blurb:
      'Capital gains, dividends, withholding, credits and disclosure — the full tax picture for an Indian investor holding US assets.',
    introHtml: `
      <p>Tax is where most of the confusion around US investing sits, and it is worth separating two questions that often get merged: what the United States takes, and what India takes.</p>
      <p>The United States does <strong>not</strong> tax an Indian resident's capital gains on US shares. It does withhold tax on dividends. India taxes both — capital gains at rates that depend on how long the holding was held, and dividends at your slab rate, with credit available for the tax already withheld in the US under the India–US Double Taxation Avoidance Agreement.</p>
      <p>Alongside the tax itself sit two obligations people miss: <strong>TCS</strong> collected by your bank when money leaves India, which is a cashflow item rather than a cost because it is creditable against your tax liability; and <strong>Schedule FA</strong> disclosure, which applies to every overseas holding regardless of whether you made a profit.</p>
      <p>Every article in this section states the rules with the date they take effect, because several changed recently and more change from FY 2026-27.</p>
    `,
    faqs: [
      {
        q: 'How are capital gains on US stocks taxed in India?',
        a: 'If you hold a US stock or ETF for more than 24 months, the gain is Long-Term Capital Gains taxed at a flat 12.5% (plus surcharge and cess), without indexation. If you hold for 24 months or less, it is Short-Term Capital Gains, added to your income and taxed at your slab rate. Rates stated as of August 2026.',
      },
      {
        q: 'Does the ₹1.25 lakh long-term capital gains exemption apply to US stocks?',
        a: 'No. The ₹1.25 lakh LTCG exemption applies to Indian listed equity and equity mutual funds only. Gains on US stocks and ETFs do not benefit from it, so long-term gains are taxable from the first rupee.',
      },
      {
        q: 'Do I pay tax in the United States on my US shares?',
        a: 'You do not pay US tax on your capital gains. You do pay US withholding tax on dividends — 25% for Indian residents under the India-US DTAA once Form W-8BEN is on file, down from the 30% default. That withheld tax can then be claimed as a foreign tax credit in India.',
      },
      {
        q: 'What is TCS and is it an extra cost?',
        a: 'TCS (Tax Collected at Source) is collected by your bank when you remit money abroad under the LRS. For overseas investments it applies at 20% on the amount exceeding ₹10 lakh of total LRS remittances in a financial year — the first ₹10 lakh attracts none. It is not an extra cost: it is adjustable against your income-tax liability and can be claimed back when you file your return.',
      },
      {
        q: 'Do I have to disclose US shares in my Indian tax return even if I made no profit?',
        a: 'Yes. Every overseas investment, brokerage account and RSU holding must be disclosed in Schedule FA of your Indian tax return regardless of whether there was any gain. Non-disclosure carries exposure under the Black Money Act.',
      },
      {
        q: 'Is there a US estate tax on shares held by Indian investors?',
        a: 'Indian residents are treated as non-resident aliens by the IRS, and US-situs assets above a USD 60,000 exemption can attract US estate tax at rates up to 40%. India does not have an estate tax treaty with the US that meaningfully raises that threshold. It affects a minority of investors but is worth planning for above that level.',
      },
    ],
  },

  {
    id: 'us-market',
    title: 'Understanding the US Stock Market',
    seoTitle: 'Understanding the US Stock Market — Timings, Exchanges & Indices',
    description:
      'US market timings in IST including the daylight-saving shift, how NYSE and NASDAQ differ, what the S&P 500, Dow Jones and Nasdaq 100 actually measure, and access to markets beyond the US.',
    blurb:
      'When the US market is open in IST, which exchange is which, and what the headline indices actually track.',
    introHtml: `
      <p>The US market runs on a different clock and a different structure from the one Indian investors know. Regular trading is <strong>7:00 PM to 1:30 AM IST</strong> while US daylight saving time is in effect (March to November) and <strong>8:00 PM to 2:30 AM IST</strong> the rest of the year — the hour shifts twice a year, which catches people out.</p>
      <p>Structurally, it helps to keep two things apart that are often confused. <strong>NYSE and NASDAQ are exchanges</strong> — venues where shares change hands. <strong>The S&P 500, the Dow Jones Industrial Average and the Nasdaq 100 are indices</strong> — measurements of baskets of shares. A company listed on NASDAQ may well be in the S&P 500; the two facts are unrelated.</p>
      <p>The articles here cover the timings in practical terms, the exchange-versus-index distinction, and how a US brokerage account also opens the door to European, Japanese and emerging-market exposure.</p>
    `,
    faqs: [
      {
        q: 'What are US stock market timings in Indian Standard Time?',
        a: 'Regular US trading hours are 7:00 PM to 1:30 AM IST during US daylight saving time (roughly March to November) and 8:00 PM to 2:30 AM IST during US standard time (roughly November to March). The one-hour shift happens because the US changes its clocks and India does not.',
      },
      {
        q: 'Can I trade US stocks before or after regular hours?',
        a: 'Pre-market and after-hours sessions exist, corresponding to roughly 4:00 PM to 7:00 PM IST and from 1:30 AM IST onwards. Liquidity is thinner and bid-ask spreads are wider in these sessions than during regular hours, so orders can fill at prices further from the last traded price.',
      },
      {
        q: 'What is the difference between NYSE and NASDAQ?',
        a: 'Both are US stock exchanges. The NYSE is the older venue and has historically used a hybrid model with designated market makers on a physical floor; NASDAQ is fully electronic and has a heavier concentration of technology listings. For a retail investor buying a listed share, the practical difference is minimal.',
      },
      {
        q: 'What is the difference between the S&P 500, the Dow and the Nasdaq 100?',
        a: 'The S&P 500 tracks 500 large US companies weighted by market capitalisation. The Nasdaq 100 tracks the largest 100 non-financial companies listed on NASDAQ, so it is technology-heavy. The Dow Jones Industrial Average tracks just 30 companies and weights them by share price rather than company size, which makes it the least representative of the three.',
      },
      {
        q: 'Does the Indian market being closed matter when I trade US stocks?',
        a: 'It works in your favour on timing. Indian markets close at 3:30 PM IST, several hours before the US session opens, so there is time to review overnight developments and pre-market activity without a scheduling conflict.',
      },
    ],
  },

  {
    id: 'etfs-and-funds',
    title: 'US ETFs, Index Funds and International Mutual Funds',
    seoTitle: 'US ETFs & Index Funds for Indian Investors — Routes and Trade-offs',
    description:
      'How Indian investors access the S&P 500 and other US indices: direct US ETFs, Indian feeder funds and GIFT City routes compared on ownership, cost, currency and taxation.',
    blurb:
      'Index exposure without picking stocks — and how the route you choose changes your tax treatment.',
    introHtml: `
      <p>Most investors going global do not want to pick individual companies. They want exposure to a market, and that is what an index fund or ETF provides.</p>
      <p>The complication for an Indian investor is that the <em>same</em> exposure is available through several structures, and they are not equivalent. Buying a US-listed S&P 500 ETF directly under the LRS gives you dollar-denominated ownership and one tax treatment. Buying an Indian feeder fund that invests in the same index keeps your money in rupees and gives you a different tax treatment. A GIFT City route differs again.</p>
      <p>None of these is universally better. They differ on ownership, control, cost, currency exposure and — most consequentially — how the gains are taxed. The articles here set the routes side by side so the trade-off is visible before you commit, and explain the metrics that actually matter when comparing funds.</p>
      <p>Nothing here is a recommendation of any specific fund. Named funds appear only as neutral illustrations of structure.</p>
    `,
    faqs: [
      {
        q: 'What is the simplest way to invest in the S&P 500 from India?',
        a: 'There are three common routes: buying a US-listed S&P 500 ETF directly under the LRS, buying an Indian feeder fund that invests into an overseas fund tracking the index, or accessing it through a GIFT City structure. They differ in ownership, currency exposure, cost and tax treatment rather than in the underlying index.',
      },
      {
        q: 'What is the difference between an ETF and an index fund?',
        a: 'Both can track the same index. An ETF trades on an exchange throughout the session at a market price, like a share. An index fund is bought and sold at the end-of-day net asset value directly from the fund house. The difference shows up in how you transact, not in what you own.',
      },
      {
        q: 'How are US ETFs taxed differently from Indian international mutual funds?',
        a: 'Directly held US ETFs are foreign assets: gains held over 24 months are taxed as LTCG at 12.5%, and shorter holdings at your slab rate. Indian feeder and fund-of-funds structures are taxed under the rules that apply to that fund category in India. Because the treatment differs, the route can matter as much as the index.',
      },
      {
        q: 'What should I look at when comparing US ETFs?',
        a: 'Expense ratio, assets under management, trading liquidity and tracking difference against the index are the standard structural metrics. For an Indian investor there is one more: dividend withholding tax reduces the effective return on a dividend-paying ETF, which does not show up in a headline expense ratio.',
      },
      {
        q: 'Do I receive dividends from US ETFs?',
        a: 'Distributing ETFs pay dividends into your brokerage account, net of US withholding tax at 25% for Indian residents with Form W-8BEN on file. That withheld amount can generally be claimed as a foreign tax credit against your Indian tax liability on the same income.',
      },
    ],
  },

  {
    id: 'lrs-and-compliance',
    title: 'LRS, TCS, Remittance and Compliance',
    seoTitle: 'LRS, TCS and Remittance Rules for Overseas Investing from India',
    description:
      'The Liberalised Remittance Scheme in practice — the USD 250,000 limit, how to send money abroad for investment, TCS on remittances, and how to bring the money back.',
    blurb:
      'Getting money out of India legally, and getting it back — limits, forms, timelines and taxes at each step.',
    introHtml: `
      <p>The Liberalised Remittance Scheme is the legal foundation of overseas investing for Indian residents. It permits remittances of up to <strong>USD 250,000 per individual per financial year</strong> for permitted purposes, and overseas equity investment is one of them.</p>
      <p>In practice the scheme raises three separate questions. Getting money <em>out</em>: which form, which purpose code, how long it takes, and what the bank charges in forex markup that rarely appears on a fee schedule. <strong>TCS</strong>: 20% on investment remittances above ₹10 lakh cumulative per PAN in a financial year — creditable against your tax liability, but a real cashflow effect at the time of remittance. And getting money <em>back</em>: the sell, settle and repatriate sequence, with tax consequences at each stage.</p>
      <p>The exit path is worth reading before the entry path. It is the question that most often stops a first deposit.</p>
    `,
    faqs: [
      {
        q: 'How much can I send abroad under the LRS?',
        a: 'Up to USD 250,000 per individual per financial year for permitted purposes, including overseas equity investment. The limit is per person, so family members each have their own.',
      },
      {
        q: 'When does TCS apply to my remittance and at what rate?',
        a: 'For remittances made for investment, TCS applies at 20% on the amount exceeding ₹10 lakh of total LRS remittances under your PAN in a financial year. The threshold was raised from ₹7 lakh to ₹10 lakh with effect from 1 April 2025. The reduced 2% rate introduced for education and medical remittances does not apply to investment remittances.',
      },
      {
        q: 'Is TCS money I lose?',
        a: 'No. TCS is a tax collected in advance, not an additional charge. It is adjustable against your income-tax liability and can be claimed as a refund when you file your return if your liability is lower. The real effect is on cashflow and timing rather than on total cost.',
      },
      {
        q: 'How do I bring money back to India from my US brokerage account?',
        a: 'You sell the securities, wait for the proceeds to settle on a T+1 basis, then place a withdrawal request specifying the amount and your bank details. The receiving bank account must be in your own name.',
      },
      {
        q: 'Do I need to report my overseas account even if I never withdraw?',
        a: 'Yes. Reporting in Schedule FA is triggered by holding the foreign asset, not by repatriating or realising a gain from it.',
      },
    ],
  },

  {
    id: 'global-investing',
    title: 'International and Global Investing',
    seoTitle: 'International Investing for Indian Investors — Why and How Much',
    description:
      'Why global diversification matters for Indian portfolios, how currency movements affect returns, how much to allocate abroad, and the routes available for international exposure.',
    blurb:
      'The case for holding assets outside India, and how large that allocation should sensibly be.',
    introHtml: `
      <p>India is a large economy and a small share of global market capitalisation. A portfolio built entirely from Indian listed equity is concentrated in one currency, one policy regime and one economic cycle — which is fine until those three move together in the wrong direction.</p>
      <p>That is the whole argument for international exposure, and it is worth being precise about what it does and does not do. Diversification reduces the impact of any single market's bad decade. It does not raise expected returns, and it introduces a factor Indian-only investors never face: <strong>currency</strong>. When you hold dollar assets, your return depends on the asset and on where the rupee goes, and those two can pull in opposite directions.</p>
      <p>The articles below cover the case for going global, how currency actually affects returns with worked numbers, how much of a portfolio might sensibly sit abroad at different income levels, and the routes available for getting there.</p>
      <p>Allocation guidance here is educational framing, not personal advice.</p>
    `,
    faqs: [
      {
        q: 'Why should an Indian investor hold assets outside India?',
        a: "India represents a small share of global market capitalisation, and an India-only portfolio is concentrated in one currency, one policy environment and one economic cycle. International exposure spreads that concentration and gives access to sectors and companies with little representation on Indian exchanges.",
      },
      {
        q: 'How does the rupee-dollar exchange rate affect my returns?',
        a: 'When you hold a dollar-denominated asset, your rupee return combines the asset return and the currency movement. If the rupee weakens against the dollar over your holding period, your rupee return is higher than the dollar return; if the rupee strengthens, it is lower. Currency can add to or subtract from performance independently of how the investment did.',
      },
      {
        q: 'How much of my portfolio should be invested globally?',
        a: 'There is no single correct figure — it depends on goals, time horizon, existing exposure (employees holding RSUs may already have substantial US exposure) and comfort with currency risk. What matters more than the exact percentage is that it is a deliberate decision rather than an accident.',
      },
      {
        q: 'Can I invest outside the US as well?',
        a: 'Yes. A US brokerage account gives access to US-listed instruments that themselves hold European, Japanese and emerging-market companies — through ADRs and US-listed international ETFs — so global exposure does not require accounts in each market.',
      },
      {
        q: 'Is international investing only for large portfolios?',
        a: 'No. Fractional share support means the size of a single share price is no longer a barrier. The practical consideration at smaller amounts is remittance cost, which favours fewer, larger transfers over frequent small ones.',
      },
    ],
  },

  {
    id: 'getting-started',
    title: 'Getting Started with Global Investing',
    seoTitle: 'Getting Started with Global Investing from India',
    description:
      'The starting point for Indian investors going global — the routes available, how accounts and remittances work, what it costs, and the questions worth settling before the first deposit.',
    blurb:
      'New to this? Start here — the routes, the process and the questions worth settling first.',
    introHtml: `
      <p>If you are at the beginning of this, the useful first step is not choosing a stock. It is choosing a <strong>route</strong>.</p>
      <p>Indian investors can go global through international mutual funds bought in rupees, through directly held US stocks and ETFs under the LRS, or through GIFT City structures. These differ in what you actually own, how much control you have, what it costs, and how you are taxed — and that last one has the largest long-run effect. Picking the route first makes every later decision simpler.</p>
      <p>After that, the sequence is fairly mechanical: complete KYC, remit funds under the LRS, file Form W-8BEN so US dividend withholding drops from 30% to the 25% treaty rate, and place your first trade. The articles below cover both halves — the strategic choice of route and the practical steps once you have chosen.</p>
    `,
    faqs: [
      {
        q: 'What is the first decision I need to make?',
        a: 'Which route to use. International mutual funds bought in rupees, directly held US stocks and ETFs under the LRS, and GIFT City structures all provide global exposure but differ in ownership, control, cost and taxation. Choosing the route first makes the subsequent decisions much simpler.',
      },
      {
        q: 'What do I need to open an account?',
        a: 'An Indian resident individual needs a valid PAN and the documents required for KYC — proof of identity, proof of address such as Aadhaar, and basic financial and bank details. The exact list is confirmed during the digital onboarding process.',
      },
      {
        q: 'How long does it take to get started?',
        a: 'Account opening is instant for resident Indians where there are no blockers, and up to 48 hours for NRIs and foreign nationals. Funds can only be added after the account is approved, because the brokerage account number is generated once KYC is complete.',
      },
      {
        q: 'What is Form W-8BEN and do I need it?',
        a: 'Form W-8BEN declares that you are an Indian tax resident to the US withholding agent. Filing it reduces US withholding tax on dividends from the 30% default to the 25% rate available under the India-US DTAA. It is worth completing before you hold any dividend-paying security.',
      },
      {
        q: 'Are there account opening or maintenance charges?',
        a: 'No. There are no account opening or maintenance charges.',
      },
    ],
  },
]

export const getTopic = (id: string): Topic | undefined =>
  TOPICS.find((t) => t.id === id)
