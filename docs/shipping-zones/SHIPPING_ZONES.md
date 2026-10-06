# Shipping charges in Fastrr checkout: how they work and how to set zone-based rates

Last updated: 2 October 2026. Rates in this document were taken from Shiprocket on that day.

## 1. The short version

- Customers on our site pay through **Fastrr** (Shiprocket Checkout). Fastrr decides the shipping charge the customer sees. Our website does not send any shipping amount to Fastrr.
- Fastrr was set to a flat charge (₹90, later ₹60) for every destination.
- The courier does not charge us a flat amount. It charges by **destination zone**: about ₹56–62 inside Mumbai/Thane, about ₹75 for most of India, about ₹107 for the Northeast, J&K, Kerala and Himachal.
- So with a flat ₹60 we lose money on almost every order outside Mumbai.
- The fix needs **no code**. Fastrr's dashboard lets us create "custom rules" that set a different flat charge for a list of destination pincodes. This document gives the zones, the charges and the pincode files to upload.

## 2. Who calculates what

There are two separate amounts. They are easy to mix up.

| Amount | Who decides it | Where it is set | Who pays it |
|---|---|---|---|
| **Shipping charge** shown at checkout | Fastrr | Fastrr dashboard → Shipping Settings | Customer pays us |
| **Freight** (courier cost) | Shiprocket and the courier | Shiprocket rate card, by weight and zone | We pay Shiprocket |

The difference between the two is our profit or loss on shipping.

How one order flows:

1. Customer clicks **Proceed to Checkout** or **Buy Now**. Our site tells Fastrr only which products and how many. It sends no shipping amount, no pincode and no payment type.
2. The customer types the address inside Fastrr. Fastrr looks at its own settings and shows a shipping charge.
3. The customer places the order. Fastrr tells our site, including the shipping charge it applied. We save it on the order. In the admin panel it appears as **"Shipping (Shiprocket)"**. This label means "the shipping the customer paid in Fastrr". It is not the courier's bill.
4. Our site creates the shipment in Shiprocket.
5. A courier is assigned in the Shiprocket panel. Only then does Shiprocket charge us freight.

Our own older checkout page (`/checkout`) does calculate real courier rates, but customers only reach it if Fastrr fails to load. No order has used it since Fastrr went live.

## 3. Why a flat charge loses money

What Fastrr charged on real orders, compared with the cheapest courier cost for the same parcel:

| Order going to | Customer paid for shipping | Cheapest courier freight |
|---|---|---|
| Mumbai (400101, 400097) | ₹60 | ₹55.72 |
| Navi Mumbai (400703) | ₹60 | ₹57.72 |
| Gujarat (394150) | ₹0 | ₹132.84 (only one courier serves it) |

The flat ₹60 is fine for Mumbai and wrong for almost everywhere else.

## 4. How the courier price is decided

Four things matter. Understanding them explains the whole table.

**1. Weight is billed in 0.5 kg steps.**
A 75 g soap, a 150 g parcel and a 300 g parcel all cost the same, because the courier bills a minimum of 0.5 kg. We tested all three weights and the price was identical. The price only goes up when the parcel is heavier than 0.5 kg.

**2. Destination zone decides the price.**
Shiprocket puts every destination into one of five billing zones, measured from our pickup pincode (400101):

| Shiprocket zone | Meaning | Typical cheapest freight (up to 0.5 kg) |
|---|---|---|
| A | Same city (Mumbai) | ₹50–56 |
| B | Same state/region (Thane, rest of Maharashtra) | ₹58–62 |
| C | Metro to metro (Delhi, Bengaluru, Chennai, Kolkata) | ₹66–70 |
| D | Rest of India (includes Gujarat, Goa, Hyderabad) | ₹70–76 |
| E | Special zones (Northeast, J&K, **Kerala, Himachal**, islands) | ₹102–108 |

**3. COD adds a separate fee.**
Freight is the same for COD and prepaid. For COD the courier adds a fee of about ₹47–52 (₹57 with Blue Dart). Fastrr already charges the customer a ₹50 COD charge, which covers this. So the shipping charge does not need to be different for COD.

**4. The price depends on which courier is used.**
The numbers here use the **cheapest** courier available for each pincode. Some pincodes have only one courier (usually Blue Dart), which costs more: ₹83–133. If a more expensive courier is assigned in the Shiprocket panel, we pay more than the table says.

## 5. How the table was built

1. Took the India Post pincode directory: 19,100 pincodes, each with its state and district.
2. Grouped the pincodes into zones by state and district.
3. Picked 360 pincodes spread across all zones and asked Shiprocket's live rate API for the price to each one, from pickup pincode 400101, for a parcel up to 0.5 kg, both prepaid and COD.
4. For each zone, looked at the cheapest courier price for every sampled pincode, then chose a charge that covers most of them and rounded it to ₹5.

This is a sample, not every pincode. Rates can change, so see section 10.

## 6. Recommended charges

"Covers" means: the share of sampled pincodes where the cheapest courier costs no more than the charge.

| Zone | Pincodes | Cheapest courier rate | Recommended Standard charge | Covers |
|---|---|---|---|---|
| 1. Local: Mumbai, Thane, Palghar | 182 | ₹56–62 | **₹65** | 79% |
| 2a. Rest of Maharashtra | 1,394 | ₹58–62 | **₹65** | 97% |
| 2b. Gujarat, Goa, Daman & Diu, Dadra & Nagar Haveli | 1,112 | ₹75 | **₹75** | 97% |
| 3. Metro: Delhi, Bengaluru, Chennai, Kolkata, Hyderabad | 442 | ₹66–75 | **₹75** | 95% |
| 4. Rest of India | 12,968 | ₹70–76 | **₹75** | 94% |
| 4k. Kerala and Himachal Pradesh | 1,837 | ₹107 | **₹110** | 100% |
| 5. Remote: Northeast, J&K, Ladakh, Andaman, Lakshadweep | 1,160 | ₹102–108 | **₹110** | 100% of serviceable |

These charges make the customer pay the full courier cost. If we want to absorb part of it:

| Customer pays | Local / rest of Maharashtra | Most of India | Remote, Kerala, Himachal |
|---|---|---|---|
| 100% | ₹65 | ₹75 | ₹110 |
| 75% | ₹50 | ₹55 | ₹85 |
| 50% | ₹35 | ₹40 | ₹55 |

Three things that are different from what you might expect:

- **Kerala and Himachal cost the same as the Northeast.** Shiprocket bills them as a special zone. If they stay at ₹75 we lose about ₹32 on each order.
- **Gujarat and Goa cost the same as the rest of India**, not the same as Maharashtra.
- **Metro cities cost about the same as the rest of India.** There is no real saving for metros from Mumbai.

So there are really only three prices: **₹65, ₹75 and ₹110**.

## 7. What to do in the Fastrr dashboard

Shiprocket's help article describes the feature: [fastrr Checkout: Manage Shipping Settings](https://support.shiprocket.in/support/solutions/articles/152000000892-fastrr-checkout-manage-shipping-settings).

In **Shipping Settings** there are two parts:

- **Default charges**: one fixed charge each for Rush, Express and Standard.
- **Custom Rules**: choose the rule type **Shipping Charge**, choose the criteria **Destination Pincodes**, add the pincodes (type them or upload a CSV), and set the flat charges for that rule.

### Simplest setup (recommended): one default and two rules

| Step | Setting | Pincode file | Standard charge |
|---|---|---|---|
| 1 | Default Standard charge | none | ₹75 |
| 2 | Custom rule "Local + Maharashtra" | `zone_1_local_mumbai_thane_palghar.csv` and `zone_2a_rest_of_maharashtra.csv` | ₹65 |
| 3 | Custom rule "Remote" | `ALTERNATIVE_zone5_remote_plus_kerala_himachal.csv` | ₹110 |

Any pincode that is not in a rule gets the default ₹75. This also catches new pincodes that are missing from our lists.

### Full setup: one rule per zone

Use this if you want every zone priced separately.

| Rule | Pincode file | Standard charge |
|---|---|---|
| Local | `zone_1_local_mumbai_thane_palghar.csv` | ₹65 |
| Rest of Maharashtra | `zone_2a_rest_of_maharashtra.csv` | ₹65 |
| Gujarat and Goa | `zone_2b_gujarat_goa_daman_dnh.csv` | ₹75 |
| Metro | `zone_3_metro_delhi_blr_chennai_kolkata_hyd.csv` | ₹75 |
| Kerala and Himachal | `zone_4k_kerala_himachal.csv` | ₹110 |
| Remote | `zone_5_remote_northeast_jk_islands.csv` | ₹110 |
| Default (rest of India) | none | ₹75 |

### COD

Keep the existing ₹50 COD charge. It already covers the courier's COD fee.

### After saving, test it

Open the site, add a product, start checkout and enter one pincode from each zone. Check the shipping charge shown:

| Pincode | Place | Expected Standard charge |
|---|---|---|
| 400067 | Mumbai | ₹65 |
| 411001 | Pune | ₹65 |
| 380001 | Ahmedabad | ₹75 |
| 110001 | Delhi | ₹75 |
| 682001 | Kochi, Kerala | ₹110 |
| 781001 | Guwahati, Assam | ₹110 |

You do not need to place the order. Close the checkout after you see the charge.

## 8. Things to decide or check first

1. **How much of the cost the customer pays**: 100%, 75% or 50% (section 6).
2. **Rush and Express charges.** Each rule asks for three charges: Rush, Express and Standard. This document only works out Standard, using the cheapest courier, which is usually surface (about 3 days local, 4–5 days for most of India, 8 days remote). Rush and Express need their own numbers.
3. **Orders heavier than 0.5 kg.** These cost about 1.5 to 1.9 times more: for example about ₹104 inside Mumbai, ₹110 to Delhi, ₹149 to Guwahati. An order with several items can cross 0.5 kg. Fastrr rules also support a **Weight Range** criteria, so a second set of rules for heavier orders can be added. The rates for that still need to be sampled.
4. **The existing rule that gave ₹0 shipping.** One order on 1 October was charged ₹0. Some rule in the dashboard is already doing that. Find it and decide if it should stay.
5. **Rule order.** Shiprocket's article does not say which rule wins if two rules match. Our pincode files do not overlap each other, so this only matters against other kinds of rules, such as the ₹0 rule above.
6. **CSV format.** Our files have one pincode per line and no heading row. Compare with the sample file Fastrr offers before uploading.
7. **GST.** The courier rates look like they include GST, but this is not confirmed. Compare one shipment with the Shiprocket passbook.

## 9. What this does not do

- It does not give exact per-order pricing. Each zone has one flat charge. A pincode served only by an expensive courier still costs us more than we collect.
- Some remote pincodes cannot be delivered at all: 6 of the 58 remote pincodes we tested (Lakshadweep and parts of Manipur, Nagaland and J&K). Some more cannot take COD.
- Fastrr has no documented way for our website to send it a live rate for each order. If Shiprocket confirms such an option exists for custom websites, the code for live rates is already in the project (`getShippingRate` in `lib/shiprocket.ts`) and could be connected.

## 10. Keeping it up to date

Check the charges again when:

- Shiprocket changes its rate card or our plan changes.
- The pickup address moves to a different pincode. All zones are measured from 400101.
- A courier is added or removed in the Shiprocket account.
- The typical parcel becomes heavier than 0.5 kg.

To check quickly: in the Shiprocket panel, use the rate calculator for one pincode in each zone (the test pincodes in section 7) and compare with section 6.

## 11. Files

All pincode files are in `docs/shipping-zones/csv/`. No pincode appears in more than one zone file.

| File | Pincodes | Use |
|---|---|---|
| `zone_1_local_mumbai_thane_palghar.csv` | 182 | Local |
| `zone_2a_rest_of_maharashtra.csv` | 1,394 | Rest of Maharashtra |
| `zone_2b_gujarat_goa_daman_dnh.csv` | 1,112 | Gujarat, Goa, Daman & Diu, Dadra & Nagar Haveli |
| `zone_3_metro_delhi_blr_chennai_kolkata_hyd.csv` | 442 | Metro cities |
| `zone_4_rest_of_india.csv` | 12,968 | Rest of India, without Kerala and Himachal |
| `zone_4k_kerala_himachal.csv` | 1,837 | Kerala and Himachal |
| `zone_5_remote_northeast_jk_islands.csv` | 1,160 | Northeast, J&K, Ladakh, islands |
| `ALTERNATIVE_zone5_remote_plus_kerala_himachal.csv` | 2,997 | Zone 5 and Kerala/Himachal together |
| `REQUESTED_zone2_rest_maharashtra_gujarat_goa.csv` | 2,506 | 2a and 2b together |
| `REQUESTED_zone4_rest_of_india_incl_kerala_himachal.csv` | 14,805 | Rest of India with Kerala and Himachal left in |

Notes on the pincode lists:

- Source: India Post pincode directory, from [All-India-Pincode-Directory](https://github.com/saravanakumargn/All-India-Pincode-Directory). It is an older copy. Palghar is listed under Thane and Ladakh under J&K, which suits these zones. Newer pincodes may be missing; the default charge covers them.
- Metro suburbs (Gurgaon, Noida, Ghaziabad, Howrah and similar) are in "rest of India", because Shiprocket bills most of them at that rate.
