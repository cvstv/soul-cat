# Source access still needed

Soul Cat can only mark a source connected after a full inventory scan is verified. A public web page or embeddable widget does not, by itself, establish a supported server feed.

## Petfinder and Desert Paws

Desert Paws’ [adoption page](https://desertpawsrescue.org/adopt) publishes a Petfinder widget for organization `AZ301`. Its script and GraphQL endpoint returned HTTP 403 during integration checks. The Adopt a Pet profile for Desert Paws currently shows no pets; nearby recommendations are other rescues and are not a substitute for Desert Paws’ inventory.

Petfinder’s [current Public GraphQL API terms](https://www.petfinder.com/public-graphql-api-terms-of-service/) describe an API. Its [widget instructions](https://www.petfinder.com/tools-widgets/custom-pet-list/getting-started/) describe account sign-in and generating embed HTML, but do not document server API credentials. An ordinary widget account has not been verified as sufficient for Soul Cat scans.

Request current documentation and access from **pets@petfinder.com**, listed on [Petfinder’s mission page](https://www.petfinder.com/adopt-or-get-involved/about-petfinder/our-mission-0/petfinders-mission/). Suggested message (not sent):

> I’m building Soul Cat, a noncommercial, open-source adoption finder. Could you provide current supported Public GraphQL API documentation and server access requirements for reading Arizona cat listings, including organization AZ301 (Desert Paws Rescue)? We need authentication instructions, complete pagination, rate limits, and the required attribution. Please also confirm permission to display these results alongside listings from other adoption sources, including Adopt a Pet. The app is https://soul-cat-cvstv.netlify.app/ and the code is https://github.com/cvstv/soul-cat.

Petfinder’s terms include attribution and restrictions on competing adoption aggregators. Confirm this combined display with Petfinder before enabling the connector. Do not put access credentials in browser code or commit them to GitHub.
