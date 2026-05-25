## [1.0.0-beta.132](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.131...v1.0.0-beta.132) (2026-04-20)


### 🐛 Bug Fixes

* fan page redirection issue fixation ([862589d](https://github.com/SponsPay/WebApp/commit/862589d3500d76dbb62e4e7b35d904790ec4256a))

## [1.0.0-beta.131](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.130...v1.0.0-beta.131) (2026-04-19)


### 🐛 Bug Fixes

* **landing-header:** hide Login button when Firebase user is restored ([2d032f6](https://github.com/SponsPay/WebApp/commit/2d032f6de7e77f28d43f1e40ebca76814d6573c2))
* **nginx:** stop static-asset regex from 404-ing Firebase auth handlers ([8bb0b84](https://github.com/SponsPay/WebApp/commit/8bb0b84de40fe64ec3eaa9bf3fdc6aac213720ee))

## [1.0.0-beta.130](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.129...v1.0.0-beta.130) (2026-04-18)


### 🚀 Features

* **fan-video:** restructure layout + referral capture + threaded messages ([f898b02](https://github.com/SponsPay/WebApp/commit/f898b02b8f919b26aa8bffed6216c62750922893))

## [1.0.0-beta.129](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.128...v1.0.0-beta.129) (2026-04-17)


### 🐛 Bug Fixes

* removed youtube thumbnail server preconnect as we don't need it anymore ([400a506](https://github.com/SponsPay/WebApp/commit/400a506557ada254e2bc56e8450b30a331b8efaf))

## [1.0.0-beta.128](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.127...v1.0.0-beta.128) (2026-04-17)


### 🐛 Bug Fixes

* on fan video page revert the socket io connection flow to get the previous previous payment state ([661fd28](https://github.com/SponsPay/WebApp/commit/661fd28ca7a4a78e3a16ab70265f6937bd3756f7))

## [1.0.0-beta.127](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.126...v1.0.0-beta.127) (2026-04-17)


### 🐛 Bug Fixes

* prevent stale index.html caching after deploys ([da60a90](https://github.com/SponsPay/WebApp/commit/da60a90699500f37be2e07759e90d42aca30872f))

## [1.0.0-beta.126](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.125...v1.0.0-beta.126) (2026-04-16)


### 🐛 Bug Fixes

* youtube embed url is sanitized and iframe is lazy loaded ([bdc27b9](https://github.com/SponsPay/WebApp/commit/bdc27b9ea48e0ae800f10f4bf07d7770cf7715c5))

## [1.0.0-beta.125](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.124...v1.0.0-beta.125) (2026-04-16)


### 🐛 Bug Fixes

* padding issue on youtube facade thumbnail ([cc18a68](https://github.com/SponsPay/WebApp/commit/cc18a68d725007b872e9f7e0d921a51260219a40))

## [1.0.0-beta.124](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.123...v1.0.0-beta.124) (2026-04-16)


### 🐛 Bug Fixes

* Optimizing the fan payment page for performance. Added skeleton loading on fan page, YouTube iframe deferred, lazy socket.io, self-hosted fonts, and preload necessary resources in index html. ([8ce8270](https://github.com/SponsPay/WebApp/commit/8ce827019ced2e409a35f1305a7d18743cafb44f))

## [1.0.0-beta.123](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.122...v1.0.0-beta.123) (2026-04-16)


### 🚀 Features

* dependencies version updated to the latest versions compatible with angular 21.2.8 ([08b67eb](https://github.com/SponsPay/WebApp/commit/08b67ebddbc8977ae48e53a7b256930d5918b6de))


### 🐛 Bug Fixes

* path changed from build to dist ([5739ab5](https://github.com/SponsPay/WebApp/commit/5739ab5dfa7183948f9d1fe19117b05cbbce5f8d))
* phone number input broken after intl-tel-input v25→v27 upgrade ([540cc11](https://github.com/SponsPay/WebApp/commit/540cc11c987cb3e8c13815e27a0f17e93f96b289))

## [1.0.0-beta.122](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.121...v1.0.0-beta.122) (2026-04-15)


### 🐛 Bug Fixes

* improve footer layout spacing after removing newsletter column ([315c007](https://github.com/SponsPay/WebApp/commit/315c0079902126fe149dcbf0e06de9b68d52989e))

## [1.0.0-beta.121](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.120...v1.0.0-beta.121) (2026-04-15)


### 🚀 Features

* add Premium Message Response and Refund Policy popup on fan payment page ([188155f](https://github.com/SponsPay/WebApp/commit/188155f0594dc046430e6c0a2d6af22ff5c40b80))


### 🐛 Bug Fixes

* add close button to refund policy modal footer and fix mobile height ([2d54bb2](https://github.com/SponsPay/WebApp/commit/2d54bb23fb77a738c86a555eda75b94285ddec35))
* decode HTML entities in YouTube video title and subject field ([02f7d91](https://github.com/SponsPay/WebApp/commit/02f7d9124197ae85838c4d7ee0774199699efca6)), closes [#39](https://github.com/SponsPay/WebApp/issues/39)

## [1.0.0-beta.120](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.119...v1.0.0-beta.120) (2026-04-15)


### 🚀 Features

* add FAQ page and wire up header/navigation links ([dbd382a](https://github.com/SponsPay/WebApp/commit/dbd382a27aec99d8aaf82b8d669d5b0ae508d1ca))
* add Privacy Policy page and extract shared legal page styles ([e82607d](https://github.com/SponsPay/WebApp/commit/e82607dff0a013a4df25e0fd4ccc3e5cb58de542))


### 🐛 Bug Fixes

* use inject() instead of constructor injection in LandingLayoutComponent ([54f5c18](https://github.com/SponsPay/WebApp/commit/54f5c18ae99f86dd1b7dcce4507681ca8dd7b1d0))

## [1.0.0-beta.119](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.118...v1.0.0-beta.119) (2026-04-15)


### 🚀 Features

* add Terms of Service page for supporters ([9dbdafc](https://github.com/SponsPay/WebApp/commit/9dbdafc0c4b350bad010555e8f33ac836d52107a))

## [1.0.0-beta.118](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.117...v1.0.0-beta.118) (2026-04-15)


### 🐛 Bug Fixes

* landing page nav issues — dashboard link, mobile menu error, active states, footer links ([0062154](https://github.com/SponsPay/WebApp/commit/00621544f0dc058b993323e3164ddeeef5415b5e))
* use FormControl.disable() instead of [disabled] attribute on reactive form inputs ([b1fefc6](https://github.com/SponsPay/WebApp/commit/b1fefc6c67575c6b51c31f31cde058b899c8d05f))

## [1.0.0-beta.117](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.116...v1.0.0-beta.117) (2026-04-14)


### 🚀 Features

* add About page with content from public draft document ([7768cce](https://github.com/SponsPay/WebApp/commit/7768cce8fa21d559df5943a9d9a09b7b8ea4fede))

## [1.0.0-beta.116](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.115...v1.0.0-beta.116) (2026-04-14)


### 🚀 Features

* angular version upgraded to 21.2.8 ([6b30b2c](https://github.com/SponsPay/WebApp/commit/6b30b2cfc50774975178d881a685e2fe22046449))
* predict-provider integration with phone-first UX and intl-tel-input v25 ([24cb61a](https://github.com/SponsPay/WebApp/commit/24cb61ad25b4521209c37f97c77e219a21e88e43))
* updated angular from 19 to 20 ([c51cbe9](https://github.com/SponsPay/WebApp/commit/c51cbe9b5324483a68b9621d0ab8ae60099b9b17))


### 🐛 Bug Fixes

* package lock deleted ([acdade3](https://github.com/SponsPay/WebApp/commit/acdade343d980dd7d90987c34a45655de7a2d0a0))
* package lock file added back ([ffa68f7](https://github.com/SponsPay/WebApp/commit/ffa68f7199c961aef7812fb0eb0f16d29c1405ac))
* regenerate package-lock.json for clean Angular 21 dependency resolution ([b3dc547](https://github.com/SponsPay/WebApp/commit/b3dc54760ec749ed5e727210426d0025fe19f640))
* remove broken per-file coverage checks incompatible with Angular 21 ([7ed0671](https://github.com/SponsPay/WebApp/commit/7ed06711dc2e5a8aa4c8bc973f7d1a52ed7c3fac))
* remove format number test case ([a2a8f05](https://github.com/SponsPay/WebApp/commit/a2a8f053ad947d4e8635222531f3d4ea4af8c9f6))
* remove stale overrides causing CI build failures ([a4cb478](https://github.com/SponsPay/WebApp/commit/a4cb478efcc0c1d0235b149d557d31e6770cd363))
* resolve Angular 21 CI failures from upgrade ([0bd10f8](https://github.com/SponsPay/WebApp/commit/0bd10f80e4e9f8e24ca93169878b1647492b47b0))
* resolve CI type errors for DOCUMENT and intl-tel-input Iti ([97d7ea8](https://github.com/SponsPay/WebApp/commit/97d7ea8a0baadb59a481e769f906414dbf2eebe1))
* resolve ngx intl input types error in test cases ([26d57eb](https://github.com/SponsPay/WebApp/commit/26d57ebc51bc4e7ff5c8991ec026229c18e4cda5))
* test case issue resolved ([2e66efe](https://github.com/SponsPay/WebApp/commit/2e66efec2059413c556a31db14cf6b49e71100e7))
* use the payer phone number in e16 format on fan payment screen ([c86ce8d](https://github.com/SponsPay/WebApp/commit/c86ce8d031efd634036a31123ff25468088eaf8d))

## [1.0.0-beta.115](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.114...v1.0.0-beta.115) (2026-04-10)


### 🐛 Bug Fixes

* ui changes ([d3f988f](https://github.com/SponsPay/WebApp/commit/d3f988fe59cab148cfd90860a47ced7e40db30fe))

## [1.0.0-beta.114](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.113...v1.0.0-beta.114) (2026-04-09)


### 🐛 Bug Fixes

* dashboard not loading on sign-in and re-sign-in ([2a6ed0c](https://github.com/SponsPay/WebApp/commit/2a6ed0ce0aa5746beacdb5d7c14dfb35b5be866d))

## [1.0.0-beta.113](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.112...v1.0.0-beta.113) (2026-04-08)


### 🚀 Features

* redesign message list with creator name, senderType icons, and compact layout ([c77e011](https://github.com/SponsPay/WebApp/commit/c77e0111c46dbb92cf99af394336b5be015aabbd))

## [1.0.0-beta.112](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.111...v1.0.0-beta.112) (2026-04-08)


### 🚀 Features

* send displayName directly instead of splitting first/last name ([808f970](https://github.com/SponsPay/WebApp/commit/808f970bbac4ee5d906cf7b7defffaf395d4d8b8))

## [1.0.0-beta.111](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.110...v1.0.0-beta.111) (2026-04-08)


### 🚀 Features

* add floating copy link pill for mobile dashboard ([82ecc7f](https://github.com/SponsPay/WebApp/commit/82ecc7f10d89ddf10b36e8adbb04e787a495e1eb))


### 🐛 Bug Fixes

* repair clipboard spy in header and layout test animation provider ([5c8c6ca](https://github.com/SponsPay/WebApp/commit/5c8c6ca89dcb8d735bcbbf471fe24213eb94f83d))

## [1.0.0-beta.110](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.109...v1.0.0-beta.110) (2026-04-08)


### 🐛 Bug Fixes

* ui changes on fan page ([49486a9](https://github.com/SponsPay/WebApp/commit/49486a900b4ba33ea750be2a453f0983c76c8f1a))

## [1.0.0-beta.109](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.108...v1.0.0-beta.109) (2026-04-08)


### 🐛 Bug Fixes

* classes fix in ui ([70ce141](https://github.com/SponsPay/WebApp/commit/70ce1415f615b575ff2e452d0cbcb162008b33bd))

## [1.0.0-beta.108](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.107...v1.0.0-beta.108) (2026-04-08)


### 🐛 Bug Fixes

* handle null youtubeEmbed in fan video page ([68abc66](https://github.com/SponsPay/WebApp/commit/68abc6668ba4644653eda17b22e4e76a9181cb34))

## [1.0.0-beta.107](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.106...v1.0.0-beta.107) (2026-04-07)


### 🐛 Bug Fixes

* ui responsive fixes ([f5c0c23](https://github.com/SponsPay/WebApp/commit/f5c0c23420461ec2618cb24d7c1f436c5aff3f25))

## [1.0.0-beta.106](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.105...v1.0.0-beta.106) (2026-04-06)


### 🚀 Features

* display YouTube channel name instead of Telegram handle ([96c88fa](https://github.com/SponsPay/WebApp/commit/96c88fab287951e999f707f5b13336053b56de65))


### 🐛 Bug Fixes

* add channelName to fan-video spec mock ([52ccfaf](https://github.com/SponsPay/WebApp/commit/52ccfaf184186eee2dec393b79e84a829b9786ba))

## [1.0.0-beta.105](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.104...v1.0.0-beta.105) (2026-04-06)


### 🚀 Features

* move sender name field above message in fan donation form ([78f02c8](https://github.com/SponsPay/WebApp/commit/78f02c8098b2296d3b92c7d9fa5873ca01e1a836))

## [1.0.0-beta.104](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.103...v1.0.0-beta.104) (2026-04-06)


### 🐛 Bug Fixes

* always poll co-admin status alongside WebSocket during onboarding ([65917de](https://github.com/SponsPay/WebApp/commit/65917de328d9d2d3821b6466265a87044276bc66))

## [1.0.0-beta.103](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.102...v1.0.0-beta.103) (2026-04-06)


### 🐛 Bug Fixes

* never reject from Zoho services — script failures are non-critical ([66cf4d3](https://github.com/SponsPay/WebApp/commit/66cf4d3b0db6e5f4a30cfbcbcf02aa0aeef394a1))
* register error intercept before clicks in integration e2e test ([308a8b6](https://github.com/SponsPay/WebApp/commit/308a8b6d204e856bfed4adfd8dea4ebcfa2c9810))

## [1.0.0-beta.102](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.101...v1.0.0-beta.102) (2026-04-06)


### 🐛 Bug Fixes

* disable zoho on dev ([33bb9e5](https://github.com/SponsPay/WebApp/commit/33bb9e5fab807554ee5cdb20cb1da308674af2be))
* reenable backzoho completely ([c27a8aa](https://github.com/SponsPay/WebApp/commit/c27a8aa6aeadc874267c1c919e0e312a35499b57))
* resolve instead of reject when Zoho services are disabled ([6c30c19](https://github.com/SponsPay/WebApp/commit/6c30c19cd6f17bd64114c8e9e45a407c946d1dea))

## [1.0.0-beta.101](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.100...v1.0.0-beta.101) (2026-04-06)


### 🐛 Bug Fixes

* forgot zoho widget code ([0ed5558](https://github.com/SponsPay/WebApp/commit/0ed5558662648eddf4ad1f443fc4bc925aa3d46e))

## [1.0.0-beta.100](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.99...v1.0.0-beta.100) (2026-04-03)


### 🐛 Bug Fixes

* add unit test for dashboard header ([8c66931](https://github.com/SponsPay/WebApp/commit/8c669314186d159583a4e9238bff5587a11ec833))
* for test case copyToClipboard ([e9829ed](https://github.com/SponsPay/WebApp/commit/e9829edaaefd8a9fd81a4bc71c8d985f5624b2d0))
* ui fixes on mobile ([04b2284](https://github.com/SponsPay/WebApp/commit/04b22844d515160c68e8869e1eefdedc403abe5a))
* update test case ([b1d3983](https://github.com/SponsPay/WebApp/commit/b1d398314bd78ad6b786453820820d359a128f3c))
* update test case ([81f1e84](https://github.com/SponsPay/WebApp/commit/81f1e84f7abe5114a0561f1059b07337aaec883f))

## [1.0.0-beta.99](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.98...v1.0.0-beta.99) (2026-03-31)


### 🐛 Bug Fixes

* tooltip ui changes in header ([a0a5b47](https://github.com/SponsPay/WebApp/commit/a0a5b4759faebafed3901420a7a2e971ba223457))
* ui cosmetic changes ([a523bb5](https://github.com/SponsPay/WebApp/commit/a523bb5327b1a7e7ec85ff45979a6b64b105ca0e))
* ui cosmetic changes ([e130669](https://github.com/SponsPay/WebApp/commit/e130669e01678bc45c84fd993626245698e0adcd))

## [1.0.0-beta.98](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.97...v1.0.0-beta.98) (2026-03-28)


### 🐛 Bug Fixes

* make fan messages section fill available vertical space ([ccbb1c8](https://github.com/SponsPay/WebApp/commit/ccbb1c8fa129fc6433a355df3bbf15f1c90115b6))

## [1.0.0-beta.97](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.96...v1.0.0-beta.97) (2026-03-27)


### 🚀 Features

* instantly display fan's new message after successful payment ([5c35940](https://github.com/SponsPay/WebApp/commit/5c35940304d37b33878634a1d267dd8165c5fd56))

## [1.0.0-beta.96](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.95...v1.0.0-beta.96) (2026-03-27)


### 🚀 Features

* add retry with different number button to payment processing modal ([7b918aa](https://github.com/SponsPay/WebApp/commit/7b918aa2399ec21811065217bd6c9ded0d554bbb))

## [1.0.0-beta.95](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.94...v1.0.0-beta.95) (2026-03-27)


### 🐛 Bug Fixes

* move amount chips below phone number in fan payment form ([dab18ee](https://github.com/SponsPay/WebApp/commit/dab18ee9236a7c1a1fd3a5cef0711abcc2dcee05))

## [1.0.0-beta.94](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.93...v1.0.0-beta.94) (2026-03-27)


### 🚀 Features

* add in-app reply and sender name to message preview modal ([f774146](https://github.com/SponsPay/WebApp/commit/f7741462bda452028cfe70cf0e75313a81e8c11b))


### 🐛 Bug Fixes

* add senderName to test fixtures and update message modal tests ([68a8e81](https://github.com/SponsPay/WebApp/commit/68a8e81e88bfd04b492c182f90d2d50ad5670ee4))
* add sendReply test coverage for message modal component ([b397dbd](https://github.com/SponsPay/WebApp/commit/b397dbd5e9ef90969a6d02c3e7d2246c8ae9679a))

## [1.0.0-beta.93](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.92...v1.0.0-beta.93) (2026-03-27)


### 🚀 Features

* improve transaction status UX with renamed statuses and explanation modal ([f188790](https://github.com/SponsPay/WebApp/commit/f188790c36c8d56479d4cfc07b44f84b6b49d0ab))


### 🐛 Bug Fixes

* add keyboard accessibility to status info modal triggers ([38dd641](https://github.com/SponsPay/WebApp/commit/38dd64187bafcb8bea0f65422f3a163df2dc5aeb))
* increase status-info-modal test coverage to meet CI thresholds ([a5f39eb](https://github.com/SponsPay/WebApp/commit/a5f39ebb3ae8907bf7051f6f884db2d3be4bb8b4))

## [1.0.0-beta.92](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.91...v1.0.0-beta.92) (2026-03-27)


### 🐛 Bug Fixes

* clear payment timer on terminal status to prevent phantom timeout dialog ([51a505b](https://github.com/SponsPay/WebApp/commit/51a505b2fe6276df6372d93d4e33aebfe2263037))

## [1.0.0-beta.91](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.90...v1.0.0-beta.91) (2026-03-26)


### 🚀 Features

* replace transaction row drawer with message preview modal ([120b49e](https://github.com/SponsPay/WebApp/commit/120b49e3b6c16fa2095370aa3c0233b060b75ab4))

## [1.0.0-beta.90](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.89...v1.0.0-beta.90) (2026-03-23)


### 🚀 Features

* enable column header sorting with active sort indicators ([904b903](https://github.com/SponsPay/WebApp/commit/904b90397684afa57af33747ddb4a9e211b2a8cd))
* responsive transaction table with shorter labels at narrow widths ([bcc0d3e](https://github.com/SponsPay/WebApp/commit/bcc0d3e9d4bad3befae32db5a9faa24257d5ef3c))

## [1.0.0-beta.89](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.88...v1.0.0-beta.89) (2026-03-23)


### 🚀 Features

* add navigation arrows and position indicator to top earning country card ([b3a2498](https://github.com/SponsPay/WebApp/commit/b3a2498619c1b355018f92553c72e43daa436772)), closes [#1](https://github.com/SponsPay/WebApp/issues/1) [#2](https://github.com/SponsPay/WebApp/issues/2) [#3](https://github.com/SponsPay/WebApp/issues/3)


### 🐛 Bug Fixes

* add status pill styling and fix topCountry → topCountries in tests ([a053af1](https://github.com/SponsPay/WebApp/commit/a053af1554d2028984e8d428800d1ad2e0d91719))
* bind pagination to actual totalRecords, add coverage tests, update pre-push docs ([b212644](https://github.com/SponsPay/WebApp/commit/b21264470fbd6a4fe2b35a04bbcea3669875c329))

## [1.0.0-beta.88](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.87...v1.0.0-beta.88) (2026-03-23)


### 🚀 Features

* fix transaction sort functionality, add multiplier display, and add reset controls ([d6aed44](https://github.com/SponsPay/WebApp/commit/d6aed4496829754130727b8e6c0a824d059eaf53))


### 🐛 Bug Fixes

* resolve lint errors by using button elements for clear badges ([c2817ff](https://github.com/SponsPay/WebApp/commit/c2817ff9868b80555ebbb27d233467c9e92a009d))

## [1.0.0-beta.87](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.86...v1.0.0-beta.87) (2026-03-23)


### 🚀 Features

* wire up transaction search, filters, and UX improvements ([b144286](https://github.com/SponsPay/WebApp/commit/b14428633e01501315f47593445d0859cc55af3e))

## [1.0.0-beta.86](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.85...v1.0.0-beta.86) (2026-03-22)


### 🚀 Features

* add USD disclaimers and null-trend handling to transaction activity cards ([db21705](https://github.com/SponsPay/WebApp/commit/db21705a6cb318c4be8272e7b79dc9010bc0fa1a))


### 🐛 Bug Fixes

* update message stats mock data in service spec for USD field renames ([f0285f9](https://github.com/SponsPay/WebApp/commit/f0285f9fc8b0d42d02adea16faa406eb2144197e))

## [1.0.0-beta.85](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.84...v1.0.0-beta.85) (2026-03-22)


### 🚀 Features

* improve payment overview drawer with real data and coming soon states ([1f1255e](https://github.com/SponsPay/WebApp/commit/1f1255ea27f823d63ebee9f47329d65954228a81))

## [1.0.0-beta.84](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.83...v1.0.0-beta.84) (2026-03-22)


### 🚀 Features

* add coming soon states to payment overview for unreleased features ([774e5e2](https://github.com/SponsPay/WebApp/commit/774e5e2bb7a44c5857a06cd58e1470042c9023d0))


### 🐛 Bug Fixes

* add accessibility attributes to disabled configure button ([41ef13b](https://github.com/SponsPay/WebApp/commit/41ef13b8797dbe53f0adfcc7f35f5c6307630da1))
* prevent duplicate API calls by centralizing channel loading in DashboardService ([7030840](https://github.com/SponsPay/WebApp/commit/70308405087bbe5701edcb9dfa31d3543a4ad034))

## [1.0.0-beta.83](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.82...v1.0.0-beta.83) (2026-03-21)


### 🚀 Features

* disable filter button with coming soon tooltip on payment overview ([3fcd064](https://github.com/SponsPay/WebApp/commit/3fcd064620f47194c0cbf3cbe0cb68476d40c0a0))
* implement payment overview search with country name, code, and currency filtering ([6da8c46](https://github.com/SponsPay/WebApp/commit/6da8c466735943a241bc12ecca36941b2a0dfb37))
* wire up payment overview with new API endpoint ([47471ea](https://github.com/SponsPay/WebApp/commit/47471ea301a5800d71de9f9679cd949a4ad74db5))


### 🐛 Bug Fixes

* add missing tests for onSearch, triggerRefresh, getPaymentOverview to meet coverage thresholds ([e77019c](https://github.com/SponsPay/WebApp/commit/e77019c5dd3eb03835b67fb026dce00e24b2fd26))
* total earnings card timezone, chart, tooltip, and trend indicator ([49dfd8c](https://github.com/SponsPay/WebApp/commit/49dfd8c4bb3c601557d97e465766382f3ae0cd52))

## [1.0.0-beta.82](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.81...v1.0.0-beta.82) (2026-03-21)


### 🚀 Features

* add info tooltip for USD estimates on top earning countries card ([8463524](https://github.com/SponsPay/WebApp/commit/8463524a1540a466ae9708df2949cddccb5b298f))

## [1.0.0-beta.81](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.80...v1.0.0-beta.81) (2026-03-21)


### 🚀 Features

* improve link analysis trend indicator with neutral state and no-data messaging ([d0d1c2f](https://github.com/SponsPay/WebApp/commit/d0d1c2f073247c682de31758978913d048341e2b))

## [1.0.0-beta.80](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.79...v1.0.0-beta.80) (2026-03-20)


### 🐛 Bug Fixes

* improve fan page vertical sizing and responsiveness ([c6715e8](https://github.com/SponsPay/WebApp/commit/c6715e8b9a065a6aa954a6bae77745d96e656dff))

## [1.0.0-beta.79](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.78...v1.0.0-beta.79) (2026-03-20)


### 🐛 Bug Fixes

* improve transaction activity responsiveness with CSS grid and proper breakpoints ([d22c095](https://github.com/SponsPay/WebApp/commit/d22c095fa44997d19b18b29059df8a990b5c7fb8))

## [1.0.0-beta.78](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.77...v1.0.0-beta.78) (2026-03-20)


### 🚀 Features

* add empty state illustrations to transaction activity summary cards ([1f7b360](https://github.com/SponsPay/WebApp/commit/1f7b360955441cef962afd6b8e520dc124c7e157))

## [1.0.0-beta.77](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.76...v1.0.0-beta.77) (2026-03-20)


### 🐛 Bug Fixes

* improve english ([f8453af](https://github.com/SponsPay/WebApp/commit/f8453afc78f2a3276159081be3e6465a935ebbf0))

## [1.0.0-beta.76](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.75...v1.0.0-beta.76) (2026-03-20)


### 🐛 Bug Fixes

* improve dashboard responsiveness with proper breakpoints and CSS grid ([78b4471](https://github.com/SponsPay/WebApp/commit/78b447105eee3d19da4f8f1755a2c0803bea2892))

## [1.0.0-beta.75](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.74...v1.0.0-beta.75) (2026-03-20)


### 🐛 Bug Fixes

* add referrerPolicy to user profile images to prevent ORB blocking ([f1d42ab](https://github.com/SponsPay/WebApp/commit/f1d42ab39856ca6c3076c8274450c55d19a25f77))

## [1.0.0-beta.74](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.73...v1.0.0-beta.74) (2026-03-20)


### 🚀 Features

* add dashboard-wide refresh button next to date filter ([b310080](https://github.com/SponsPay/WebApp/commit/b31008015d41a535804f3eb7c2f63e76413bd81e))

## [1.0.0-beta.73](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.72...v1.0.0-beta.73) (2026-03-20)


### 🚀 Features

* add empty state illustrations to dashboard cards when no data ([defb521](https://github.com/SponsPay/WebApp/commit/defb5216a0b0b033f908ed587350fa92dc3fccb8))

## [1.0.0-beta.72](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.71...v1.0.0-beta.72) (2026-03-20)


### 🚀 Features

* add beta badge, coming soon indicators, and single-channel selector hiding ([d79c9f9](https://github.com/SponsPay/WebApp/commit/d79c9f960e93a3bd019cb2cd14881ded7e19a8f4))
* add coming soon treatment to user dropdown menu items ([54d3d94](https://github.com/SponsPay/WebApp/commit/54d3d94a0a024f6656cdfe2f673f1ade069dfec5))

## [1.0.0-beta.71](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.70...v1.0.0-beta.71) (2026-03-16)


### 🚀 Features

* adding support dialog to the onboarding process ([49dc916](https://github.com/SponsPay/WebApp/commit/49dc9165d921f24c78257b3636bad430b9f14467))
* improve responsiveness of the onboarding process ([918715e](https://github.com/SponsPay/WebApp/commit/918715e45e96a2ee102b543d93d62fe9b743d793))
* improvements and refinmenets to the integration component ([b5b7b5c](https://github.com/SponsPay/WebApp/commit/b5b7b5c81ebbc93aa171003ed58fe2342ece9ea8))
* refinements to the potential eranings component ([f1e769b](https://github.com/SponsPay/WebApp/commit/f1e769b07eec08d30865fe7c25d1054d3356aeff))
* refining the estimator main page ([47fe686](https://github.com/SponsPay/WebApp/commit/47fe686e20ab3f9e7b26693dcc2bf46b86c7151a))


### 🐛 Bug Fixes

* correct PotentialEarningComponent test to match reduce-by-max-viewers behavior ([864e894](https://github.com/SponsPay/WebApp/commit/864e8944068ba7dfe6b2560e31348f1b0e35df53))

## [1.0.0-beta.71](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.70...v1.0.0-beta.71) (2026-03-16)


### 🚀 Features

* adding support dialog to the onboarding process ([49dc916](https://github.com/SponsPay/WebApp/commit/49dc9165d921f24c78257b3636bad430b9f14467))
* improve responsiveness of the onboarding process ([918715e](https://github.com/SponsPay/WebApp/commit/918715e45e96a2ee102b543d93d62fe9b743d793))
* improvements and refinmenets to the integration component ([b5b7b5c](https://github.com/SponsPay/WebApp/commit/b5b7b5c81ebbc93aa171003ed58fe2342ece9ea8))
* refinements to the potential eranings component ([f1e769b](https://github.com/SponsPay/WebApp/commit/f1e769b07eec08d30865fe7c25d1054d3356aeff))
* refining the estimator main page ([47fe686](https://github.com/SponsPay/WebApp/commit/47fe686e20ab3f9e7b26693dcc2bf46b86c7151a))


### 🐛 Bug Fixes

* correct PotentialEarningComponent test to match reduce-by-max-viewers behavior ([864e894](https://github.com/SponsPay/WebApp/commit/864e8944068ba7dfe6b2560e31348f1b0e35df53))

## [1.0.0-beta.70](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.69...v1.0.0-beta.70) (2026-03-01)


### 🚀 Features

* add idempotency key to fan payment requests ([#46](https://github.com/SponsPay/WebApp/issues/46)) ([06a6c7f](https://github.com/SponsPay/WebApp/commit/06a6c7fbdddc79822d71d9627d9b006562ed2045))

## [1.0.0-beta.69](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.68...v1.0.0-beta.69) (2026-03-01)


### 🚀 Features

* add 10-min countdown timer to payment processing and fix timeout handling ([fe7ec79](https://github.com/SponsPay/WebApp/commit/fe7ec791303978ae06822901cf3af47e675577ea))

## [1.0.0-beta.68](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.67...v1.0.0-beta.68) (2026-03-01)


### 🐛 Bug Fixes

* resolve ng-select disabled error and improve fan payment UX ([8ad136f](https://github.com/SponsPay/WebApp/commit/8ad136fcea6d99cbced62567fd1a94e9141cd86f))

## [1.0.0-beta.67](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.66...v1.0.0-beta.67) (2026-03-01)


### 🐛 Bug Fixes

* an account with 0 youtube channels onboarding fix ([1c74a0e](https://github.com/SponsPay/WebApp/commit/1c74a0ec8952ebd7916b633c7d18e65d530e0ade))
* no back button terms section ([ec21bff](https://github.com/SponsPay/WebApp/commit/ec21bff425ae088afc553bebd8c34c9bf6879df8))
* update terms step e2e test to match removed back button ([137350d](https://github.com/SponsPay/WebApp/commit/137350d23a052acc152ec4b2e3f7a01602d6998a))

## [1.0.0-beta.66](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.65...v1.0.0-beta.66) (2026-02-23)


### 🐛 Bug Fixes

* scroll buttons into view for CI viewport and fix e2e cache key ([75ed233](https://github.com/SponsPay/WebApp/commit/75ed2337ac6e54a434c64a2201c62536a0fcf285))
* scroll onboarding content wrapper for CI viewport in happy path ([1b36bd3](https://github.com/SponsPay/WebApp/commit/1b36bd3efd80f069752fb7d0eae0687e465b0086))
* stabilize CI e2e tests and gate semantic release on quality checks ([acf88c8](https://github.com/SponsPay/WebApp/commit/acf88c81a1e13b1bae07fe060452c14fdf853a5e))
* use force clicks in happy path for fixed header overlap on CI ([4eb7319](https://github.com/SponsPay/WebApp/commit/4eb731924e2d6938e6c620c054fc470159b5c762))

## [1.0.0-beta.65](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.64...v1.0.0-beta.65) (2026-02-23)


### 🚀 Features

* 00 cypress tests are running well now ([fea5be6](https://github.com/SponsPay/WebApp/commit/fea5be60722be7cee96e4048e3125431931693c2))
* add comprehensive e2e tests for creator onboarding flow ([93938b0](https://github.com/SponsPay/WebApp/commit/93938b0f2389f92c83ec98959f8c2a5c0ca710fa))
* fix all onboarding e2e tests and re-enable CI pipeline ([8b709ea](https://github.com/SponsPay/WebApp/commit/8b709eaece77ba696b6911d37999fdf4520ecc1c))

## [1.0.0-beta.64](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-02-22)


### 🚀 Features

* sign out on going back to the first step to try with another google account ([9fb7f2b](https://github.com/SponsPay/WebApp/commit/9fb7f2b05f51272fab25dd7721dcda3eb37165d6))

## [1.0.0-beta.63](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.62...v1.0.0-beta.63) (2026-02-22)


### 🐛 Bug Fixes

* add missing unit tests for Zoho PageSense coverage thresholds ([020154b](https://github.com/SponsPay/WebApp/commit/020154b56f09ddc307abbf6f0031798f8185d0ba))
* add missing unit tests for Zoho PageSense coverage thresholds ([2410a7e](https://github.com/SponsPay/WebApp/commit/2410a7e5e2916b454ceeb71308a8ca8e5404be0f))

## [1.0.0-beta.62](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.61...v1.0.0-beta.62) (2026-02-22)


### 🚀 Features

* add Zoho PageSense analytics integration ([36e460a](https://github.com/SponsPay/WebApp/commit/36e460a5c698068aab6387d9d6fc512ace16ab79))

## [1.0.0-beta.61](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-02-22)


### 🐛 Bug Fixes

* show clear error when YouTube OAuth account has no channel ([447d5df](https://github.com/SponsPay/WebApp/commit/447d5dfd2c089a3c682cb209fad98115ca826a65))

## [1.0.0-beta.60](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-02-22)


### 🚀 Features

* simplify api key guard ([7a44ff0](https://github.com/SponsPay/WebApp/commit/7a44ff07a1987667af35afe2c6b3a3f42d19bba3))

## [1.0.0-beta.59](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-02-22)


### 🚀 Features

* proper logout + prevent onboarding without joining a telegram channel ([40eaaa6](https://github.com/SponsPay/WebApp/commit/40eaaa6732ac12666e0285f2f7f2a9cbb18d8f33))

## [1.0.0-beta.58](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-02-21)


### 🐛 Bug Fixes

* trigger release for latest changes ([f809a4a](https://github.com/SponsPay/WebApp/commit/f809a4a59159021a25ac9e4b0350fcc2dd6af8cf))

## [1.0.0-beta.57](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-02-21)


### 🐛 Bug Fixes

* add missing setConnectionStatus mock to test specs ([9d5c5d9](https://github.com/SponsPay/WebApp/commit/9d5c5d999be31c6fcef5669de2fd0253ddaf5e0f))

## [1.0.0-beta.56](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-02-21)


### 🚀 Features

* allow YouTube channel disconnect during onboarding ([f52f920](https://github.com/SponsPay/WebApp/commit/f52f9201135456414ac7cf3c995fcb6dfd3eca55))

## [1.0.0-beta.55](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-02-21)


### 🚀 Features

* use backend market data for onboarding revenue estimator ([7cadeaf](https://github.com/SponsPay/WebApp/commit/7cadeaf572cb5a2ab3854ef2f079f0e7ce41f709))

## [1.0.0-beta.54](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-02-20)


### 🐛 Bug Fixes

* lint fix ([189932c](https://github.com/SponsPay/WebApp/commit/189932ca84806d0ff775972265eda19028861015))

## [1.0.0-beta.53](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-02-20)


### 🐛 Bug Fixes

* estimator button disabled when available channel length is zero in onboarding flow ([7240ea6](https://github.com/SponsPay/WebApp/commit/7240ea66bac0cf923a6b270df74cf661e872490e))

## [1.0.0-beta.52](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-02-20)


### 🐛 Bug Fixes

* onboarding QA issues - back button, validation, lorem ipsum, toast, and flash ([0416931](https://github.com/SponsPay/WebApp/commit/0416931f0805faae32fdfbc77e70389c8b403bd9))

## [1.0.0-beta.51](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-02-19)


### 🐛 Bug Fixes

* onboarding issues fixes ([ab6f6d8](https://github.com/SponsPay/WebApp/commit/ab6f6d80a49cf2fdd6c5a9da55f46d9d75cfc296))

## [1.0.0-beta.50](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-02-17)


### 🐛 Bug Fixes

* top country check added on the transaction activity component ([51d8c43](https://github.com/SponsPay/WebApp/commit/51d8c432c2f690ef245bd54c62d82f75fd02dc95))

## [1.0.0-beta.49](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-02-16)


### 🐛 Bug Fixes

* resolve bugs in production code exposed by test review ([9fc3747](https://github.com/SponsPay/WebApp/commit/9fc374781ca2daa2190570090084bc5acfc84b0a))

## [1.0.0-beta.48](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-02-16)


### 🐛 Bug Fixes

* missing import in integration component test ([e85b62b](https://github.com/SponsPay/WebApp/commit/e85b62b157104ee4b56c0513633cf03d1fffe60d))

## [1.0.0-beta.47](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-02-16)


### 🐛 Bug Fixes

* resolve bugs and clean up youtube channel selector component ([ab176d2](https://github.com/SponsPay/WebApp/commit/ab176d2d5c6d4e22337f48ff756dd091b8376548))

## [1.0.0-beta.46](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-02-13)


### 🐛 Bug Fixes

* no data label shown in the top earning country and avg earning chart data mapped ([7577f4a](https://github.com/SponsPay/WebApp/commit/7577f4a3f8c0da47f433e64d5ec26e264b73a724))

## [1.0.0-beta.45](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-02-13)


### 🚀 Features

* youtube channel selection added in header, selected channel id passed in params for creator insights ([9944232](https://github.com/SponsPay/WebApp/commit/99442328b46a5e0e2f0372a15ef035bc448f889d))

## [1.0.0-beta.44](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.43...v1.0.0-beta.44) (2026-02-09)


### 🚀 Features

* sort and filters implemented on latest transaction api ([0677023](https://github.com/SponsPay/WebApp/commit/0677023f213b10d00d487105d6e57011e69f9d62))

## [1.0.0-beta.43](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.42...v1.0.0-beta.43) (2026-02-06)


### 🚀 Features

* add auto-sync for YouTube channel data ([cc732f0](https://github.com/SponsPay/WebApp/commit/cc732f0f7f87eb82ba2be8e965e71461e866449a))
* add YouTube channel selector step in onboarding ([5a8edd1](https://github.com/SponsPay/WebApp/commit/5a8edd10d9d07045ac946cd19cce1f09682677f8))
* first pass on refactoring auth flow ([b9c5819](https://github.com/SponsPay/WebApp/commit/b9c58198af358222d7a8438732f49713e5825e08))
* implement secure popup-based YouTube OAuth flow ([bd486ee](https://github.com/SponsPay/WebApp/commit/bd486ee5fa3418dab3568997eb90cab41f0849b6))
* Increase step tracker width on large screens in the onboarding component. ([2164766](https://github.com/SponsPay/WebApp/commit/2164766d291a80a21cf8b85f79dfdce2e1ae70f5))
* pass actual estimator percentages during creator onboarding ([f539920](https://github.com/SponsPay/WebApp/commit/f5399200847545546da7ee12238d0bc1dab02cce))
* rework the auth flow to get channel data from the backend ([0f62b0a](https://github.com/SponsPay/WebApp/commit/0f62b0a68c6c814838f14adb188f163246b3031f))


### 🐛 Bug Fixes

* authenticate with the real users instead of youtube channels ([9bc91ac](https://github.com/SponsPay/WebApp/commit/9bc91ac849de0cb9bfd299d806e4579beb285edc))
* ensure user creation happens before any backend calls ([d838881](https://github.com/SponsPay/WebApp/commit/d8388815f911a6fb0844a505eec39c99f4dc02a6))
* fetch YouTube Analytics data from backend instead of direct API calls ([3602641](https://github.com/SponsPay/WebApp/commit/360264139731d8635626566350f436dfc7a79e52))
* initialize YouTube connection status from backend ([b889879](https://github.com/SponsPay/WebApp/commit/b8898797c4596a9bb4833d76883a382bfbf6edbb))
* pass Firebase token in query param for YouTube OAuth ([8540154](https://github.com/SponsPay/WebApp/commit/85401548333de792717e90b48e9fe05f02fcd31f))
* properly fetch YouTube channels after OAuth ([af577f3](https://github.com/SponsPay/WebApp/commit/af577f373972b005f23ee8706cc28827914b5bb9))
* remove obsolete channel fields from sign-in request ([5615bfa](https://github.com/SponsPay/WebApp/commit/5615bfa662045042a7433126251a80b724f1bd80))
* update TypeScript types to match backend changes ([c2f83bf](https://github.com/SponsPay/WebApp/commit/c2f83bf60ba485d8b0c8c1fd115cb7efe7dc8aef))

## [1.0.0-beta.42](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-02-05)


### 🐛 Bug Fixes

* set minimum subscriber to 1 for testing ([e8ce62e](https://github.com/SponsPay/WebApp/commit/e8ce62ef33c689bc972bbc12b51cc1781c0b8277))

## [1.0.0-beta.41](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-01-30)


### 🚀 Features

* access token added in sign in and onboard api, on fan payment check for live stream implemented ([715b492](https://github.com/SponsPay/WebApp/commit/715b492469e9e5cf574848c61baafdc84b7195d0))

## [1.0.0-beta.40](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2026-01-30)


### 🐛 Bug Fixes

* timer fix ([67e8525](https://github.com/SponsPay/WebApp/commit/67e8525f9166b7898e6374233b4e33787dc7b62b))

## [1.0.0-beta.39](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2026-01-29)


### 🐛 Bug Fixes

* fix for deployment ([67bd569](https://github.com/SponsPay/WebApp/commit/67bd569450a9cb66a05a40293c2b196922287777))

## [1.0.0-beta.38](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-01-27)


### 🐛 Bug Fixes

* fix for deployment ([40b487e](https://github.com/SponsPay/WebApp/commit/40b487e32f7b57a590aa3ab41568abec1ee60974))

## [1.0.0-beta.37](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-01-27)


### 🐛 Bug Fixes

* message statuses handled on websocket, and persist the payment session on reload until status is resolved ([87d1d6d](https://github.com/SponsPay/WebApp/commit/87d1d6d50f3f9df3748da80769440ea1702ed227))

## [1.0.0-beta.36](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-01-21)


### 🐛 Bug Fixes

* subject field added on fan page ([421a154](https://github.com/SponsPay/WebApp/commit/421a15486a380ac446cd7e69d8b4bee6256246a9))

## [1.0.0-beta.35](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2026-01-20)


### 🐛 Bug Fixes

* join telegram by tap on QR code, update multiples ([a0abcdb](https://github.com/SponsPay/WebApp/commit/a0abcdba5cc65ec8adef9bd31d96222a5e2c8ddc))

## [1.0.0-beta.34](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.33...v1.0.0-beta.34) (2026-01-14)


### 🐛 Bug Fixes

* fan video width fixes ([134aeb2](https://github.com/SponsPay/WebApp/commit/134aeb256a37f51e2bd3fe4fffb98d27376453ac))

## [1.0.0-beta.33](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2026-01-14)


### 🐛 Bug Fixes

* scrollbar made slim, fan video responsive issues handled ([a11369b](https://github.com/SponsPay/WebApp/commit/a11369bd6238e903d2dc65bcedf8f4c5c665a466))

## [1.0.0-beta.32](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-01-14)


### 🐛 Bug Fixes

* fan video responsive ui changes, video subject made editable ([3aa097c](https://github.com/SponsPay/WebApp/commit/3aa097c73808bc59ca690cba5ca3382a2b4dc03b))

## [1.0.0-beta.31](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-01-14)


### 🐛 Bug Fixes

* auth load fix testing ([8882301](https://github.com/SponsPay/WebApp/commit/88823018d8b5e373ceec547cd0602e78d1dbe891))

## [1.0.0-beta.30](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2026-01-14)


### 🐛 Bug Fixes

* auth provider loading issue ([67b6c32](https://github.com/SponsPay/WebApp/commit/67b6c32d2b984a240544fc2b7922880b6a26fef4))

## [1.0.0-beta.29](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-01-14)


### 🐛 Bug Fixes

* onboarding clear assets to reset flow ([55dbab2](https://github.com/SponsPay/WebApp/commit/55dbab2340dde4646c860d4d7fb89978b0b11854))

## [1.0.0-beta.28](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### 🐛 Bug Fixes

* update environment configuration for local development ([52b8daa](https://github.com/SponsPay/WebApp/commit/52b8daad85fecf9a80d3433847d6131cda767969))

## [1.0.0-beta.27](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2026-01-12)


### 🐛 Bug Fixes

* dummy data removed from potential earning, navigation to dashboard from onboarding page handled ([0ac0541](https://github.com/SponsPay/WebApp/commit/0ac0541f2d1a4a4894514ad16be6b59c8fde7b07))

## [1.0.0-beta.26](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2026-01-06)


### 🚀 Features

* transaction list, drawer and message modal ui ([68202f7](https://github.com/SponsPay/WebApp/commit/68202f78a36032b85f155a3172b7237bfb22a471))

## [1.0.0-beta.25](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2026-01-05)


### 🚀 Features

* ui changes in fan page, automatic token refresh ([2a209ea](https://github.com/SponsPay/WebApp/commit/2a209eac0ba68db344b38f79401c6168a668a1aa))

## [1.0.0-beta.24](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2026-01-02)


### 🐛 Bug Fixes

* ui flow fixes ([65f157e](https://github.com/SponsPay/WebApp/commit/65f157ef09b6bed12ff113d5f8a392b8ba6ff762))

## [1.0.0-beta.23](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.22...v1.0.0-beta.23) (2026-01-01)


### 🐛 Bug Fixes

* home pages available after login, user email ellipsis implemented ([bd94dd9](https://github.com/SponsPay/WebApp/commit/bd94dd95a54651aedf06388f930054e4e5f79b16))

## [1.0.0-beta.22](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2025-12-26)


### 🚀 Features

* transaction activity cards and list ui design ([280d785](https://github.com/SponsPay/WebApp/commit/280d785158bbe57051fdbe773fc0c3e7857aaf2c))

## [1.0.0-beta.21](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.20...v1.0.0-beta.21) (2025-12-24)


### 🚀 Features

* poll call implemented for fan payment status in case websocket fails, optional referral fields added in the fan payment api ([fd0a875](https://github.com/SponsPay/WebApp/commit/fd0a875f15c1cc506db9f4382e5d9af328be1661))

## [1.0.0-beta.20](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2025-12-22)


### 🐛 Bug Fixes

* ui changes on dashboard ([24117af](https://github.com/SponsPay/WebApp/commit/24117af51691b818a0f7bb07a6be93cca9970fd2))

## [1.0.0-beta.19](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2025-12-19)


### 🐛 Bug Fixes

* fan payment web socket implementation ([7eada14](https://github.com/SponsPay/WebApp/commit/7eada14768327e8aa4356b6032fa3fb315d19ce1))

## [1.0.0-beta.18](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.17...v1.0.0-beta.18) (2025-12-17)


### 🐛 Bug Fixes

* api changes on the fan page ([68bd8a4](https://github.com/SponsPay/WebApp/commit/68bd8a4d5baab5797b74386daa1729e60437f433))

## [1.0.0-beta.17](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2025-12-12)


### 🚀 Features

* payment api and currency api implemented on fan video screen ([860ca25](https://github.com/SponsPay/WebApp/commit/860ca253bb6bb0542e3f28745e01380b91036f61))

## [1.0.0-beta.16](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.15...v1.0.0-beta.16) (2025-12-10)


### 🚀 Features

* fan page api implementation, onboarding based on actual data ([93d35b4](https://github.com/SponsPay/WebApp/commit/93d35b4bb78833f95b067d469e87a618145fa08a))

## [1.0.0-beta.15](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2025-12-03)


### 🐛 Bug Fixes

* user redirected on login, on refresh redirection to dashboard resolved ([1635392](https://github.com/SponsPay/WebApp/commit/1635392b939ef44e92f0f77ec4881850c9d7b63a))

## [1.0.0-beta.14](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2025-11-14)


### 🚀 Features

* page title change on route change ([29a21d4](https://github.com/SponsPay/WebApp/commit/29a21d441ddfd270346c4e2952b7bfd874e47b5b))

## [1.0.0-beta.13](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2025-11-03)


### 🚀 Features

* **frontend:** add lightweight co-admin status endpoint for polling fallback ([ae7c0a8](https://github.com/SponsPay/WebApp/commit/ae7c0a848a9e9603d90aa85515ca1586d18e1683))
* **frontend:** add state management for telegram integration step 2 (Phase 3) ([a92a369](https://github.com/SponsPay/WebApp/commit/a92a369a557bdfa0a020c9fa3c8ffd7e638a51f2))
* **frontend:** add styles for telegram integration step 2 states (Phase 7) ([b850edd](https://github.com/SponsPay/WebApp/commit/b850edd3476f241c78947f00605977887b6ed5be)), closes [#007](https://github.com/SponsPay/WebApp/issues/007) [#10B981](https://github.com/SponsPay/WebApp/issues/10B981)
* **frontend:** implement WebSocket connection for telegram integration (Phase 4) ([7d39a9d](https://github.com/SponsPay/WebApp/commit/7d39a9df331c49eedfeec05f1cf208cf00570061))
* **frontend:** install socket.io-client for WebSocket support (Phase 1) ([1879c9c](https://github.com/SponsPay/WebApp/commit/1879c9c202d6554c3d745d4aee46ffb32b3c1aa5))
* **frontend:** remove obsolete addCoAdmin service method (Phase 5) ([2d3c7a8](https://github.com/SponsPay/WebApp/commit/2d3c7a8f0c1d8c9eed61a2d734cf6be6aeb5bf43))
* **frontend:** update integration step 2 template (Phase 2) ([a73ce66](https://github.com/SponsPay/WebApp/commit/a73ce662242bc631a3ab988c4972d0608c1f5056))
* **frontend:** update type definitions for Telegram integration (Phase 6) ([8a86052](https://github.com/SponsPay/WebApp/commit/8a86052c4ffc0fe76560f8afa0e33ea2db0d4394))


### 🐛 Bug Fixes

* **frontend:** update wording to reflect channel already created ([ec0e701](https://github.com/SponsPay/WebApp/commit/ec0e7014e6206b654de079e3d338a97f7f3453c2))
* issues with socketio room naming ([4412654](https://github.com/SponsPay/WebApp/commit/44126540e170642cfe2a03f5da8f2ce6e6f538c6))
* use the correct channel name to listen for telegram updates ([abca111](https://github.com/SponsPay/WebApp/commit/abca11187860a333e04f50d42a7240f8c0ce9c08))

## [1.0.0-beta.12](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2025-10-29)


### 🐛 Bug Fixes

* not sending co-admin api call if co-admin is null ([62b2305](https://github.com/SponsPay/WebApp/commit/62b23054110889442354d4b547058b53538f6718))

## [1.0.0-beta.11](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.10...v1.0.0-beta.11) (2025-10-29)


### 🚀 Features

* centralized alert, loader handling ([58b216a](https://github.com/SponsPay/WebApp/commit/58b216a404987c713ed6200943091840aa8d7fc6))


### 🐛 Bug Fixes

* timeout type error fix ([4d76633](https://github.com/SponsPay/WebApp/commit/4d766334f292e3d46661916fe97bcde7ef6d46e0))

## [1.0.0-beta.10](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2025-10-28)


### 🐛 Bug Fixes

* lint fix ([8a3e8b6](https://github.com/SponsPay/WebApp/commit/8a3e8b64e76eeb3a31a2ce9d7785d58a5eb21367))
* user dropdown menu ui fix ([0764665](https://github.com/SponsPay/WebApp/commit/07646657efeb46d9b59a3f39304e0d59f2a4bfef))

## [1.0.0-beta.9](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.8...v1.0.0-beta.9) (2025-10-28)


### 🚀 Features

* common alert service, ui changes ([4898409](https://github.com/SponsPay/WebApp/commit/4898409c95338caa0f3382b43b81e1e528298e30))

## [1.0.0-beta.8](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.7...v1.0.0-beta.8) (2025-10-26)


### 🐛 Bug Fixes

* send the correct value when trying to add the user as a coadmin ([cb01ac6](https://github.com/SponsPay/WebApp/commit/cb01ac6559b47249d67e867f2b8cd390fd88d55f))

## [1.0.0-beta.7](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.6...v1.0.0-beta.7) (2025-10-26)


### 🐛 Bug Fixes

* send the value of keep me updated field to the cancellation endpoint ([1fe4e1f](https://github.com/SponsPay/WebApp/commit/1fe4e1fdf3e4daaf20ff1053ac7e3d0a77753f2a))

## [1.0.0-beta.6](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2025-10-26)


### 🐛 Bug Fixes

* sign-in now sends firebaseUid ([3dadb4e](https://github.com/SponsPay/WebApp/commit/3dadb4e1d10ceddd643333ce5d212966f1bbca78))

## [1.0.0-beta.5](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.4...v1.0.0-beta.5) (2025-10-21)


### 🐛 Bug Fixes

* the api key header ([889ccc6](https://github.com/SponsPay/WebApp/commit/889ccc62f5053075ac7115ac349da9f44a002d6c))

## [1.0.0-beta.4](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.3...v1.0.0-beta.4) (2025-10-03)


### 🐛 Bug Fixes

* ui changes in fan form ([64a0a38](https://github.com/SponsPay/WebApp/commit/64a0a3850fe09af0885c22808f95ebc72bf9c135))

## [1.0.0-beta.3](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2025-08-16)


### 🚀 Features

* landing page details api implemented ([05c045d](https://github.com/SponsPay/WebApp/commit/05c045d706993752fcfa82d17fdfe8d8898a4e08))
* setting pages design implemented ([e76ca31](https://github.com/SponsPay/WebApp/commit/e76ca31c5ce68e374bc3cb0e96acce1fc0774307))

## [1.0.0-beta.2](https://github.com/SponsPay/WebApp/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2025-08-03)


### 🚀 Features

* landing page, onboarding flow implemented till integrations along with responsive design ([147aa80](https://github.com/SponsPay/WebApp/commit/147aa80b82541e10904ef8134dbb841255926a8e))

## 1.0.0-beta.1 (2025-07-07)


### 🚀 Features

* add first step of user session persistence ([25a9758](https://github.com/SponsPay/WebApp/commit/25a97589ba771ae04cc7c329b16b3ee07f335d06))
* add semantic release to the app build process ([540ca56](https://github.com/SponsPay/WebApp/commit/540ca569a3e87d93e191ef583d1b1f0b4e77453e))
* added step progress component ([ab3a5b9](https://github.com/SponsPay/WebApp/commit/ab3a5b9c13add4205ec79f4a5f1499fa64301ed0))
* both options are in there, for local environments we have signinwithpopup, and signinwithredirect for the cloud hosted environments ([fdb32cd](https://github.com/SponsPay/WebApp/commit/fdb32cd2a6d738b285a45ec3b93ce9bc44060436))
* chaging the google login with redirect ([0e4118e](https://github.com/SponsPay/WebApp/commit/0e4118e218bffe54c5e8072a796dbe12e974c7f4))
* Complete IAP Implementation for the dev page ([6ead967](https://github.com/SponsPay/WebApp/commit/6ead9679bc5014c4264cfd12b26dddcd32ad8daa))
* create a prospect of every sign in to the sponspay web app ([e76e9fa](https://github.com/SponsPay/WebApp/commit/e76e9faeba4179c8a3f3f45dc50128b40ce6a5f8))
* Cross-Page Loading State Management ([1fd9692](https://github.com/SponsPay/WebApp/commit/1fd9692da771a84eb07a36dd3498919e9a236efc))
* design adjustments + coming soon option for the 3d button ([51577df](https://github.com/SponsPay/WebApp/commit/51577df755f130e9521c318b8c9ce171c2900364))
* Enhanced 3D Button with Loading Animation and Error Handling ([0c522d9](https://github.com/SponsPay/WebApp/commit/0c522d9f45df07f2988a4310dab41cdc47008b6f))
* first set of visual improvements + added the sidenav menu ([e46e5fb](https://github.com/SponsPay/WebApp/commit/e46e5fb1909a5e647413bb232e6c9eabf5685376))
* generate mock data for the estimator details as well ([78906ef](https://github.com/SponsPay/WebApp/commit/78906ef294a4cfebc53daf3fafcc715225de30c6))
* get correct data type on the analytics report ([2b05df1](https://github.com/SponsPay/WebApp/commit/2b05df1573b4fd3d8a10d314cec3f36a9b16933a))
* improve the styling of the access details table + some cleanup ([b182c8f](https://github.com/SponsPay/WebApp/commit/b182c8f8925e2308ad76257945364be276659d91))
* improved responsiveness of the revenue estimator modal ([c40e9f0](https://github.com/SponsPay/WebApp/commit/c40e9f03ac9a2bc11c6171f71f957fec6833790b))
* phase 1 of the revenue estimator, we can now either mock or get real data from youtube channels ([29fd120](https://github.com/SponsPay/WebApp/commit/29fd120c813e4922000c7b37d9e2cac19fb892f2))
* phase 2 of the revenue estimator where the big component is broken up into many smaller components ([e022e34](https://github.com/SponsPay/WebApp/commit/e022e346bab379655bfdbf2f2f7443b451d36564))
* phase 3, added message variation based on subscriber numbers ([c242216](https://github.com/SponsPay/WebApp/commit/c24221660c2f9c30f81ddfa7b9ad27c6ca23def1))
* refactored deployment manifests and added production variant through kustomize ([823cfc9](https://github.com/SponsPay/WebApp/commit/823cfc91ef54e66ea954c5f5a309a05da0b171bd))
* revenue estimator has the correct colors now ([09533e4](https://github.com/SponsPay/WebApp/commit/09533e4e6864166a76a2611eef1435ed77548569))
* revenue estimator table design ([08bda95](https://github.com/SponsPay/WebApp/commit/08bda95815d478af5cb7cf5b1106394cc82d13dc))
* second phase of the revenue estimator phase completed ([35dba7c](https://github.com/SponsPay/WebApp/commit/35dba7c95473c5994da78e7d5a91a02ff60b0eb8))
* skip prospect creation if the session has already been saved ([b9fa451](https://github.com/SponsPay/WebApp/commit/b9fa451ca97ea9d018ae933a5454e2068ef5390b))
* work don on token refresh + new debug panel and debug tools created ([cf7a25e](https://github.com/SponsPay/WebApp/commit/cf7a25e56864b826726e9f50bc67b9c996511030))


### 🐛 Bug Fixes

* all lint and unit tests look good now ([8c9b576](https://github.com/SponsPay/WebApp/commit/8c9b576a6531cc9743937c960463f389dd8c17c9))
* an issue with vscode not correctly recognizing jasmine types ([9de48e9](https://github.com/SponsPay/WebApp/commit/9de48e9273302f753bdef635c946bb1ffb0d3be0))
* fix e2e tests wtih accordion elements ([fb28d2e](https://github.com/SponsPay/WebApp/commit/fb28d2e453c198541da5775f2d777bbdd6c3a06c))
* Fixed Redirect Flow Channel Status Issue ([56c50be](https://github.com/SponsPay/WebApp/commit/56c50be05bcb8be7f841f9c2eec7fea8f91b6749))
* footer was not responsive enough ([eb32238](https://github.com/SponsPay/WebApp/commit/eb3223850c54b96c76aa8e759e8f13593b0b4dc2))
* improve slider consistency with numbers ([2f5f003](https://github.com/SponsPay/WebApp/commit/2f5f00350e021be9adeae542430361f247dae9a2))
* improvements and error handling in the auth flow ([acb10b7](https://github.com/SponsPay/WebApp/commit/acb10b7c08077f292527198e79d1f75ec6e7a971))
* include all country flags in angular.json ([dbf7be5](https://github.com/SponsPay/WebApp/commit/dbf7be51dfa2b30b9a57fd0c856295d3889597d5))
* introduce environments in the build process ([c60ed11](https://github.com/SponsPay/WebApp/commit/c60ed117339de2a5f4c009c4bed4c3b5262b77c1))
* introduce linter into the webapp ([2bbc626](https://github.com/SponsPay/WebApp/commit/2bbc6268589490427789295d3c2ddc49f9d94803))
* let the view load before trying to analyze channels ([013edba](https://github.com/SponsPay/WebApp/commit/013edba108d5286029ed7656811f3ed5bd70eceb))
* missing bootstrap icons ([b0ae4ef](https://github.com/SponsPay/WebApp/commit/b0ae4efd304963fbda907e75a3d0df319905a110))
* open the phone number from the footer in whatsapp directly ([94582e9](https://github.com/SponsPay/WebApp/commit/94582e9475c16a77c507a5a72461cfaa1c85a5c9))
* pathes was configured the wrong way in the prod template ([cfaebab](https://github.com/SponsPay/WebApp/commit/cfaebab69899483f78984baaebe6e91d2ae71ec9))
* refactoring the image path in the ci workflow ([8148e1b](https://github.com/SponsPay/WebApp/commit/8148e1b9555de6753e085add041faed9bfa13c86))
* resolve FAQ accordion visibility issue in CI environment ([d3dfef5](https://github.com/SponsPay/WebApp/commit/d3dfef55386c72e1b072246cd45dc8aeeb529cdb))
* resolve FAQ accordion visibility issues in all E2E test files ([a997c9d](https://github.com/SponsPay/WebApp/commit/a997c9dacabd1655902cdc72296e692f7a8ef295))
* successive traversals warning ([aeeb2b0](https://github.com/SponsPay/WebApp/commit/aeeb2b030a9a68b115138cd6def44c9bb153a46b))
* Trust the session storage flags ([99d98c4](https://github.com/SponsPay/WebApp/commit/99d98c4a94ef4a304cbbfb0d25e92e30c71a0bc7))
* update the correct name of the container repository ([44b8f38](https://github.com/SponsPay/WebApp/commit/44b8f38dde2e7102232449e3a0730cb91b7f0cbc))
* use the right env variable ([eab8686](https://github.com/SponsPay/WebApp/commit/eab86866181fff3e363000593eada737b1a1d07b))
* verify fixtures type fix ([56bfd0e](https://github.com/SponsPay/WebApp/commit/56bfd0ec4b0510a06c9240cac723309b962fd778))
* work on issues with the auth redirect flow ([18ed577](https://github.com/SponsPay/WebApp/commit/18ed577b26b216ed92090605977f729b500509c2))

# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits](https://conventionalcommits.org/) for automated changelog generation.

## [Unreleased]

### 🚀 Features
- Implemented semantic versioning with conventional commits
- Added automated changelog generation
- Integrated Google Chat notifications for releases
- Enhanced CI/CD pipeline with semantic release

### 📋 Notes
- Starting version: 0.0.1
- Beta releases available on dev branch
- Production releases on main branch
- Automated Docker image tagging with semantic versions

---

*This changelog is automatically generated by [semantic-release](https://github.com/semantic-release/semantic-release)*
