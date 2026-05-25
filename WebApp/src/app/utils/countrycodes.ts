const alpha3to2: Record<string, string> = {
    AFG: 'AF',  // Afghanistan
    ALB: 'AL',  // Albania
    DZA: 'DZ',  // Algeria
    ASM: 'AS',  // American Samoa
    AND: 'AD',  // Andorra
    AGO: 'AO',  // Angola
    AIA: 'AI',  // Anguilla
    ATA: 'AQ',  // Antarctica
    ATG: 'AG',  // Antigua and Barbuda
    ARG: 'AR',  // Argentina
    ARM: 'AM',  // Armenia
    ABW: 'AW',  // Aruba
    AUS: 'AU',  // Australia
    AUT: 'AT',  // Austria
    AZE: 'AZ',  // Azerbaijan
    BHS: 'BS',  // Bahamas
    BHR: 'BH',  // Bahrain
    BGD: 'BD',  // Bangladesh
    BRB: 'BB',  // Barbados
    BLR: 'BY',  // Belarus
    BEL: 'BE',  // Belgium
    BLZ: 'BZ',  // Belize
    BEN: 'BJ',  // Benin
    BMU: 'BM',  // Bermuda
    BTN: 'BT',  // Bhutan
    BOL: 'BO',  // Bolivia
    BIH: 'BA',  // Bosnia and Herzegovina
    BWA: 'BW',  // Botswana
    BRA: 'BR',  // Brazil
    IOT: 'IO',  // British Indian Ocean Territory
    VGB: 'VG',  // British Virgin Islands
    BRN: 'BN',  // Brunei
    BGR: 'BG',  // Bulgaria
    BFA: 'BF',  // Burkina Faso
    BDI: 'BI',  // Burundi
    KHM: 'KH',  // Cambodia
    CMR: 'CM',  // Cameroon
    CAN: 'CA',  // Canada
    CPV: 'CV',  // Cape Verde
    CYM: 'KY',  // Cayman Islands
    CAF: 'CF',  // Central African Republic
    TCD: 'TD',  // Chad
    CHL: 'CL',  // Chile
    CHN: 'CN',  // China
    CXR: 'CX',  // Christmas Island
    CCK: 'CC',  // Cocos Islands
    COL: 'CO',  // Colombia
    COM: 'KM',  // Comoros
    COG: 'CG',  // Congo (Republic)
    COD: 'CD',  // Congo (Democratic Republic)
    COK: 'CK',  // Cook Islands
    CRI: 'CR',  // Costa Rica
    CIV: 'CI',  // Ivory Coast (Côte d'Ivoire)
    HRV: 'HR',  // Croatia
    CUB: 'CU',  // Cuba
    CUW: 'CW',  // Curacao
    CYP: 'CY',  // Cyprus
    CZE: 'CZ',  // Czech Republic
    DNK: 'DK',  // Denmark
    DJI: 'DJ',  // Djibouti
    DMA: 'DM',  // Dominica
    DOM: 'DO',  // Dominican Republic
    ECU: 'EC',  // Ecuador
    EGY: 'EG',  // Egypt
    SLV: 'SV',  // El Salvador
    GNQ: 'GQ',  // Equatorial Guinea
    ERI: 'ER',  // Eritrea
    EST: 'EE',  // Estonia
    SWZ: 'SZ',  // Eswatini
    ETH: 'ET',  // Ethiopia
    FLK: 'FK',  // Falkland Islands
    FRO: 'FO',  // Faroe Islands
    FJI: 'FJ',  // Fiji
    FIN: 'FI',  // Finland
    FRA: 'FR',  // France
    GAB: 'GA',  // Gabon
    GMB: 'GM',  // Gambia
    GEO: 'GE',  // Georgia
    DEU: 'DE',  // Germany
    GHA: 'GH',  // Ghana
    GIB: 'GI',  // Gibraltar
    GRC: 'GR',  // Greece
    GRD: 'GD',  // Grenada
    GLP: 'GP',  // Guadeloupe
    GUM: 'GU',  // Guam
    GTM: 'GT',  // Guatemala
    GIN: 'GN',  // Guinea
    GNB: 'GW',  // Guinea-Bissau
    GUY: 'GY',  // Guyana
    HTI: 'HT',  // Haiti
    HMD: 'HM',  // Heard Island and McDonald Islands
    HND: 'HN',  // Honduras
    HKG: 'HK',  // Hong Kong
    HUN: 'HU',  // Hungary
    ISL: 'IS',  // Iceland
    IND: 'IN',  // India
    IDN: 'ID',  // Indonesia
    IRN: 'IR',  // Iran
    IRQ: 'IQ',  // Iraq
    IRL: 'IE',  // Ireland
    ISR: 'IL',  // Israel
    ITA: 'IT',  // Italy
    JAM: 'JM',  // Jamaica
    JPN: 'JP',  // Japan
    JEY: 'JE',  // Jersey
    JOR: 'JO',  // Jordan
    KAZ: 'KZ',  // Kazakhstan
    KEN: 'KE',  // Kenya
    KIR: 'KI',  // Kiribati
    KOS: 'KO',  // Kosovo
    KWT: 'KW',  // Kuwait
    KGZ: 'KG',  // Kyrgyzstan
    LAO: 'LA',  // Laos
    LVA: 'LV',  // Latvia
    LBN: 'LB',  // Lebanon
    LSO: 'LS',  // Lesotho
    LBR: 'LR',  // Liberia
    LBY: 'LY',  // Libya
    LIE: 'LI',  // Liechtenstein
    LTU: 'LT',  // Lithuania
    LUX: 'LU',  // Luxembourg
    MAC: 'MO',  // Macau
    MDG: 'MG',  // Madagascar
    MWI: 'MW',  // Malawi
    MYS: 'MY',  // Malaysia
    MDV: 'MV',  // Maldives
    MLI: 'ML',  // Mali
    MLT: 'MT',  // Malta
    MHL: 'MH',  // Marshall Islands
    MTQ: 'MQ',  // Martinique
    MUS: 'MU',  // Mauritius
    MYT: 'YT',  // Mayotte
    MEX: 'MX',  // Mexico
    FSM: 'FM',  // Micronesia
    MDA: 'MD',  // Moldova
    MCO: 'MC',  // Monaco
    MNG: 'MN',  // Mongolia
    MNE: 'ME',  // Montenegro
    MSR: 'MS',  // Montserrat
    MAR: 'MA',  // Morocco
    MOZ: 'MZ',  // Mozambique
    MMR: 'MM',  // Myanmar (Burma)
    NAM: 'NA',  // Namibia
    NRU: 'NR',  // Nauru
    NPL: 'NP',  // Nepal
    NLD: 'NL',  // Netherlands
    NCL: 'NC',  // New Caledonia
    NZL: 'NZ',  // New Zealand
    NIC: 'NI',  // Nicaragua
    NER: 'NE',  // Niger
    NGA: 'NG',  // Nigeria
    NIU: 'NU',  // Niue
    NFK: 'NF',  // Norfolk Island
    MKD: 'MK',  // North Macedonia
    PRK: 'KP',  // North Korea
    NOR: 'NO',  // Norway
    OMN: 'OM',  // Oman
    PAK: 'PK',  // Pakistan
    PLW: 'PW',  // Palau
    PSE: 'PS',  // Palestine
    PAN: 'PA',  // Panama
    PNG: 'PG',  // Papua New Guinea
    PRY: 'PY',  // Paraguay
    PER: 'PE',  // Peru
    PHL: 'PH',  // Philippines
    POL: 'PL',  // Poland
    PRT: 'PT',  // Portugal
    PRI: 'PR',  // Puerto Rico
    QAT: 'QA',  // Qatar
    REU: 'RE',  // Réunion
    ROU: 'RO',  // Romania
    RUS: 'RU',  // Russia
    RWA: 'RW',  // Rwanda
    KNA: 'KN',  // Saint Kitts and Nevis
    LCA: 'LC',  // Saint Lucia
    VCT: 'VC',  // Saint Vincent and the Grenadines
    WSM: 'WS',  // Samoa
    SMR: 'SM',  // San Marino
    STP: 'ST',  // São Tomé and Príncipe
    SAU: 'SA',  // Saudi Arabia
    SEN: 'SN',  // Senegal
    SRB: 'RS',  // Serbia
    SYC: 'SC',  // Seychelles
    SLE: 'SL',  // Sierra Leone
    SGP: 'SG',  // Singapore
    SVK: 'SK',  // Slovakia
    SVN: 'SI',  // Slovenia
    SLB: 'SB',  // Solomon Islands
    SOM: 'SO',  // Somalia
    ZAF: 'ZA',  // South Africa
    SSD: 'SS',  // South Sudan
    ESP: 'ES',  // Spain
    LKA: 'LK',  // Sri Lanka
    SHN: 'SH',  // Saint Helena
    SJM: 'SJ',  // Svalbard and Jan Mayen
    SWE: 'SE',  // Sweden
    CHE: 'CH',  // Switzerland
    SYR: 'SY',  // Syria
    TJK: 'TJ',  // Tajikistan
    THA: 'TH',  // Thailand
    TLS: 'TL',  // Timor-Leste
    TGO: 'TG',  // Togo
    TKL: 'TK',  // Tokelau
    TON: 'TO',  // Tonga
    TTO: 'TT',  // Trinidad and Tobago
    TUN: 'TN',  // Tunisia
    TUR: 'TR',  // Turkey
    TKM: 'TM',  // Turkmenistan
    TUV: 'TV',  // Tuvalu
    TZA: 'TZ',  // Tanzania
    UGA: 'UG',  // Uganda
    UKR: 'UA',  // Ukraine
    ARE: 'AE',  // United Arab Emirates
    GBR: 'GB',  // United Kingdom
    USA: 'US',  // United States
    URY: 'UY',  // Uruguay
    UZB: 'UZ',  // Uzbekistan
    VUT: 'VU',  // Vanuatu
    VEN: 'VE',  // Venezuela
    VNM: 'VN',  // Vietnam
    WLF: 'WF',  // Wallis and Futuna
    YEM: 'YE',  // Yemen
    ZMB: 'ZM',  // Zambia
    ZWE: 'ZW',  // Zimbabwe
};

export const getAlpha2Code = (alpha3: string): string => {
    const alpha2 = alpha3to2[alpha3.toUpperCase()];
    return alpha2 || '';
}