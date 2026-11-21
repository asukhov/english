import json, math
# Build a comprehensive but compact numbers-units dataset.
obj={
 "intro":"This reference explains how English expresses numbers, dates, times, and common measurement units. It also includes conversion factors for a built-in converter.",
 "numberSections":[],
 "unitSections":[],
 "conversions":{},
 "phrases":[]
}
def sec(id,title,intro,entries): return {"id":id,"title":title,"intro":intro,"entries":entries}
def ne(word,symbol,ipa,explanation,example,note=""):
    return {"word":word,"symbol":str(symbol),"ipa":ipa,"explanation":explanation,"example":example,"note":note}
# Cardinals
card=[ne('zero','0','/ˈzɪərəʊ/','the number 0; nothing','The temperature fell to zero.'),
ne('one','1','/wʌn/','the number 1','I have one brother.'),
ne('two','2','/tuː/','the number 2','She bought two tickets.'),
ne('three','3','/θriː/','the number 3','There are three options.'),
ne('four','4','/fɔː/','the number 4','The table has four legs.'),
ne('five','5','/faɪv/','the number 5','I work five days a week.'),
ne('six','6','/sɪks/','the number 6','The lesson starts at six.'),
ne('seven','7','/ˈsevən/','the number 7','There are seven days in a week.'),
ne('eight','8','/eɪt/','the number 8','She slept for eight hours.'),
ne('nine','9','/naɪn/','the number 9','The shop closes at nine.'),
ne('ten','10','/ten/','the number 10','I counted to ten.'),
ne('eleven','11','/ɪˈlevən/','the number 11','There are eleven players on the team.'),
ne('twelve','12','/twelv/','the number 12','A dozen means twelve.'),
ne('thirteen','13','/ˌθɜːˈtiːn/','the number 13','He turned thirteen today.'),
ne('fourteen','14','/ˌfɔːˈtiːn/','the number 14','She waited fourteen days.'),
ne('fifteen','15','/ˌfɪfˈtiːn/','the number 15','The break lasts fifteen minutes.'),
ne('sixteen','16','/ˌsɪkˈstiːn/','the number 16','There are sixteen cups in a gallon.','US liquid measure context.'),
ne('seventeen','17','/ˌsevənˈtiːn/','the number 17','Seventeen students passed the exam.'),
ne('eighteen','18','/ˌeɪˈtiːn/','the number 18','You can vote at eighteen in many countries.'),
ne('nineteen','19','/ˌnaɪnˈtiːn/','the number 19','Nineteen people attended.'),
ne('twenty','20','/ˈtwenti/','the number 20','There are twenty chairs in the room.')]
tens=[('thirty','30','/ˈθɜːti/'),('forty','40','/ˈfɔːti/'),('fifty','50','/ˈfɪfti/'),('sixty','60','/ˈsɪksti/'),('seventy','70','/ˈsevnti/'),('eighty','80','/ˈeɪti/'),('ninety','90','/ˈnaɪnti/'),('one hundred','100','/wʌn ˈhʌndrəd/')]
for w,s,ipa in tens: card.append(ne(w,s,ipa,f'the number {s}',f'The room holds {w} people.'))
obj['numberSections'].append(sec('cardinals','Cardinal numbers','Cardinal numbers show how many things there are.',card))
# Ordinals
ords_data=[('first','1st','/fɜːst/'),('second','2nd','/ˈsekənd/'),('third','3rd','/θɜːd/'),('fourth','4th','/fɔːθ/'),('fifth','5th','/fɪfθ/'),('sixth','6th','/sɪksθ/'),('seventh','7th','/ˈsevənθ/'),('eighth','8th','/eɪtθ/'),('ninth','9th','/naɪnθ/'),('tenth','10th','/tenθ/'),('eleventh','11th','/ɪˈlevənθ/'),('twelfth','12th','/twelfθ/'),('thirteenth','13th','/ˌθɜːˈtiːnθ/'),('twentieth','20th','/ˈtwentiəθ/'),('thirtieth','30th','/ˈθɜːtiəθ/'),('hundredth','100th','/ˈhʌndrədθ/')]
ords=[ne(w,s,ipa,f'the ordinal number for position {s}',f'She finished in {w} place.') for w,s,ipa in ords_data]
obj['numberSections'].append(sec('ordinals','Ordinal numbers','Ordinal numbers show position or order.',ords))
# Large numbers
large=[ne('hundred','100','/ˈhʌndrəd/','ten times ten; 100','About one hundred people attended.'),
ne('thousand','1,000','/ˈθaʊzənd/','ten hundreds; 1,000','The stadium holds several thousand fans.'),
ne('million','1,000,000','/ˈmɪljən/','one thousand thousands; 1,000,000','The city has over one million residents.'),
ne('billion','1,000,000,000','/ˈbɪljən/','one thousand millions in short scale','The company is worth two billion dollars.','In modern English, billion usually means 1,000,000,000.'),
ne('trillion','1,000,000,000,000','/ˈtrɪljən/','one thousand billions in short scale','The national debt reached one trillion.','Short scale.')]
obj['numberSections'].append(sec('large-numbers','Large numbers','Large number names in modern short-scale English.',large))
# Fractions, decimals, etc.
misc=[ne('half','1/2','/hɑːf/','one of two equal parts','I ate half the apple.'),
ne('quarter','1/4','/ˈkwɔːtə/','one of four equal parts','A quarter of the class was absent.'),
ne('third','1/3','/θɜːd/','one of three equal parts','One third of the cake is left.'),
ne('decimal','0.5','/ˈdesɪməl/','a number written with a decimal point','Write 0.5 as a decimal.'),
ne('percent','%','/pəˈsent/','a number out of one hundred','About 20 percent of students were late.'),
ne('negative number','-1','/ˈneɡətɪv ˈnʌmbə/','a number less than zero','Minus five is a negative number.'),
ne('plus','+','/plʌs/','the sign for addition','Two plus three equals five.'),
ne('minus','-','/ˈmaɪnəs/','the sign for subtraction or negative values','Ten minus four equals six.'),
ne('times','×','/taɪmz/','the sign or word for multiplication','Three times four equals twelve.'),
ne('divided by','÷','/dɪˈvaɪdɪd baɪ/','used to show division','Twelve divided by three equals four.'),
ne('equals','=','/ˈiːkwəlz/','shows that two amounts are the same','Two plus two equals four.')]
obj['numberSections'].append(sec('fractions-math','Fractions, decimals, and math','Common ways to read fractions, decimals, percentages, and arithmetic.',misc))
# Roman/date/time
rdt=[ne('Roman numerals','I, V, X','/ˌrəʊmən ˈnjuːmərəlz/','letters used in an ancient number system','The clock used Roman numerals.','I=1, V=5, X=10, L=50, C=100, D=500, M=1000.'),
ne('date','21 November 2026','/deɪt/','a numbered day in a month and year','The date today is 21 November 2026.'),
ne('time','14:30','/taɪm/','the hour and minutes of the day','The meeting starts at 14:30.'),
ne('a.m.','08:00','/ˌeɪ ˈem/','before midday','The train leaves at 8:00 a.m.'),
ne('p.m.','20:00','/ˌpiː ˈem/','after midday','The film starts at 8:00 p.m.')]
obj['numberSections'].append(sec('dates-time','Dates, time, and Roman numerals','Common number formats for dates, time, and Roman numerals.',rdt))
# Units helpers
def ue(name,symbol,plural,quantity,definition,relation,factor,base,example,note=""):
    return {"name":name,"symbol":symbol,"plural":plural,"quantity":quantity,"definition":definition,"relation":relation,"factor":factor,"base":base,"example":example,"note":note}

si_base=[
 ue('metre','m','metres','length','the SI base unit of length','base unit',1,'m','The room is four metres wide.','American spelling: meter.'),
 ue('kilogram','kg','kilograms','mass','the SI base unit of mass','base unit',1,'kg','The bag weighs two kilograms.'),
 ue('second','s','seconds','time','the SI base unit of time','base unit',1,'s','Wait for ten seconds.'),
 ue('ampere','A','amperes','electric current','the SI base unit of electric current','base unit',1,'A','The charger supplies two amperes.'),
 ue('kelvin','K','kelvins','temperature','the SI base unit of thermodynamic temperature','base unit',1,'K','Water freezes at 273.15 kelvins.','Use offset conversion for Celsius/Fahrenheit.'),
 ue('mole','mol','moles','amount of substance','the SI base unit for amount of substance','base unit',1,'mol','One mole contains about 6.022e23 particles.'),
 ue('candela','cd','candelas','luminous intensity','the SI base unit of luminous intensity','base unit',1,'cd','The lamp has a luminous intensity measured in candelas.'),
]
obj['unitSections'].append(sec('si-base','SI base units','The seven base units of the International System of Units (SI).',si_base))

si_derived=[
 ue('newton','N','newtons','force','the SI unit of force','1 kg*m/s^2',1,'N','The force was measured in newtons.'),
 ue('joule','J','joules','energy','the SI unit of energy and work','1 N*m',1,'J','Food energy can be compared in joules.'),
 ue('watt','W','watts','power','the SI unit of power','1 J/s',1,'W','The bulb uses 10 watts.'),
 ue('pascal','Pa','pascals','pressure','the SI unit of pressure','1 N/m^2',1,'Pa','Tire pressure is often given in kilopascals.'),
 ue('hertz','Hz','hertz','frequency','the SI unit of frequency','1 cycle per second',1,'Hz','The note has a frequency of 440 hertz.'),
 ue('volt','V','volts','voltage','the SI unit of electric potential difference','1 W/A',1,'V','The battery provides 1.5 volts.'),
 ue('degree Celsius','°C','degrees Celsius','temperature','a temperature scale used in most countries','K = °C + 273.15',1,'°C','Water boils at 100 degrees Celsius.','Conversion uses offset.'),
]
obj['unitSections'].append(sec('si-derived','Common SI derived units','Important SI derived units used in everyday science and technology.',si_derived))

prefixes=[
 ue('kilo','k','kilo','SI prefix','a prefix meaning one thousand','10^3',1000,'base','One kilometre is 1,000 metres.','Applies to many units.'),
 ue('hecto','h','hecto','SI prefix','a prefix meaning one hundred','10^2',100,'base','A hectolitre is 100 litres.'),
 ue('deca','da','deca','SI prefix','a prefix meaning ten','10^1',10,'base','A decametre is 10 metres.'),
 ue('deci','d','deci','SI prefix','a prefix meaning one tenth','10^-1',0.1,'base','A decilitre is 0.1 litre.'),
 ue('centi','c','centi','SI prefix','a prefix meaning one hundredth','10^-2',0.01,'base','A centimetre is 0.01 metre.'),
 ue('milli','m','milli','SI prefix','a prefix meaning one thousandth','10^-3',0.001,'base','A milligram is 0.001 gram.'),
 ue('micro','µ','micro','SI prefix','a prefix meaning one millionth','10^-6',0.000001,'base','A microsecond is one millionth of a second.'),
 ue('mega','M','mega','SI prefix','a prefix meaning one million','10^6',1000000,'base','One megabyte is often used informally for digital size.'),
 ue('giga','G','giga','SI prefix','a prefix meaning one billion','10^9',1000000000,'base','A gigawatt is one billion watts.'),
]
obj['unitSections'].append(sec('si-prefixes','SI prefixes','Prefixes that scale SI units by powers of ten.',prefixes))

length=[
 ue('kilometre','km','kilometres','length','a metric unit of length equal to 1,000 metres','1000 m',1000,'m','The village is five kilometres away.','AmE: kilometer.'),
 ue('centimetre','cm','centimetres','length','a metric unit of length equal to 0.01 metre','0.01 m',0.01,'m','The book is 20 centimetres long.','AmE: centimeter.'),
 ue('millimetre','mm','millimetres','length','a metric unit of length equal to 0.001 metre','0.001 m',0.001,'m','The gap is two millimetres wide.'),
 ue('mile','mi','miles','length','an imperial/US unit of length equal to 1,609.344 metres','1609.344 m',1609.344,'m','The park is two miles away.'),
 ue('yard','yd','yards','length','an imperial/US unit of length equal to 0.9144 metre','0.9144 m',0.9144,'m','The fabric is three yards long.'),
 ue('foot','ft','feet','length','an imperial/US unit of length equal to 0.3048 metre','0.3048 m',0.3048,'m','He is six feet tall.'),
 ue('inch','in','inches','length','an imperial/US unit of length equal to 0.0254 metre','0.0254 m',0.0254,'m','The screen is 15 inches wide.'),
 ue('nautical mile','nmi','nautical miles','length','a unit used in sea and air travel equal to 1,852 metres','1852 m',1852,'m','The ship sailed 20 nautical miles.'),
]
obj['unitSections'].append(sec('length','Length units','Common metric, imperial, and nautical length units.',length))

mass=[
 ue('gram','g','grams','mass','a metric unit of mass equal to 0.001 kilogram','0.001 kg',0.001,'kg','Add 100 grams of flour.'),
 ue('milligram','mg','milligrams','mass','a metric unit of mass equal to 0.000001 kilogram','1e-6 kg',0.000001,'kg','The tablet contains 500 milligrams.'),
 ue('tonne','t','tonnes','mass','a metric unit of mass equal to 1,000 kilograms','1000 kg',1000,'kg','The truck carries two tonnes.','Also called metric ton.'),
 ue('pound','lb','pounds','mass','an imperial/US unit of mass equal to 0.45359237 kilogram','0.45359237 kg',0.45359237,'kg','The bag weighs five pounds.'),
 ue('ounce','oz','ounces','mass','an imperial/US unit of mass equal to 0.028349523125 kilogram','0.028349523125 kg',0.028349523125,'kg','Add two ounces of cheese.'),
 ue('stone','st','stone','mass','a British unit of mass equal to 6.35029318 kilograms','14 lb',6.35029318,'kg','He weighs eleven stone.','Mostly UK.'),
]
obj['unitSections'].append(sec('mass','Mass units','Common metric and imperial units of mass.',mass))

volume=[
 ue('litre','L','litres','volume','a metric unit of volume equal to 0.001 cubic metre','0.001 m^3',0.001,'m^3','Buy one litre of milk.','AmE: liter.'),
 ue('millilitre','mL','millilitres','volume','a metric unit of volume equal to 0.000001 cubic metre','1e-6 m^3',0.000001,'m^3','Take 5 millilitres of syrup.'),
 ue('cubic metre','m³','cubic metres','volume','the SI unit of volume','base derived unit',1,'m^3','The tank holds two cubic metres.'),
 ue('US gallon','gal (US)','US gallons','volume','a US unit of liquid volume equal to 3.785411784 litres','3.785411784 L',0.003785411784,'m^3','The car uses a gallon of fuel.','US liquid gallon.'),
 ue('UK gallon','gal (UK)','UK gallons','volume','a British unit of volume equal to 4.54609 litres','4.54609 L',0.00454609,'m^3','The old recipe used a UK gallon.','Imperial gallon.'),
 ue('pint','pt','pints','volume','a unit of volume; different in UK and US','UK 0.56826125 L / US 0.473176473 L',0.000473176473,'m^3','He ordered a pint of juice.','US pint used as default factor; see note.'),
 ue('cup','cup','cups','volume','a cooking volume measure, often 240 mL in US recipes','240 mL',0.00024,'m^3','Add one cup of rice.','Cooking measures vary.'),
 ue('tablespoon','tbsp','tablespoons','volume','a cooking measure equal to about 15 mL','15 mL',0.000015,'m^3','Add one tablespoon of oil.'),
 ue('teaspoon','tsp','teaspoons','volume','a cooking measure equal to about 5 mL','5 mL',0.000005,'m^3','Add one teaspoon of salt.'),
]
obj['unitSections'].append(sec('volume','Volume and capacity','Common volume units for science, daily life, and cooking.',volume))

area=[
 ue('square metre','m²','square metres','area','the SI unit of area','base derived unit',1,'m^2','The apartment is 60 square metres.'),
 ue('square kilometre','km²','square kilometres','area','an area equal to 1,000,000 square metres','1,000,000 m^2',1000000,'m^2','The city covers 300 square kilometres.'),
 ue('hectare','ha','hectares','area','an area equal to 10,000 square metres','10,000 m^2',10000,'m^2','The farm has 20 hectares of land.'),
 ue('acre','ac','acres','area','an imperial/US unit of area equal to 4,046.8564224 square metres','4046.8564224 m^2',4046.8564224,'m^2','They bought five acres of land.'),
 ue('square foot','ft²','square feet','area','an area equal to 0.09290304 square metre','0.09290304 m^2',0.09290304,'m^2','The room is 120 square feet.'),
]
obj['unitSections'].append(sec('area','Area units','Units used to measure surface area.',area))

speed=[
 ue('metre per second','m/s','metres per second','speed','the SI unit of speed','base derived unit',1,'m/s','The runner moved at five metres per second.'),
 ue('kilometre per hour','km/h','kilometres per hour','speed','a speed unit common in transport','1/3.6 m/s',0.2777777778,'m/s','The speed limit is 50 kilometres per hour.'),
 ue('mile per hour','mph','miles per hour','speed','an imperial/US speed unit','0.44704 m/s',0.44704,'m/s','The car was going 60 miles per hour.'),
 ue('knot','kn','knots','speed','a nautical speed unit equal to one nautical mile per hour','0.5144444444 m/s',0.5144444444,'m/s','The boat traveled at 15 knots.'),
]
obj['unitSections'].append(sec('speed','Speed units','Units used to measure speed in transport and science.',speed))

time=[
 ue('minute','min','minutes','time','a unit of time equal to 60 seconds','60 s',60,'s','The call lasted ten minutes.'),
 ue('hour','h','hours','time','a unit of time equal to 60 minutes','3600 s',3600,'s','I slept for eight hours.'),
 ue('day','d','days','time','a unit of time equal to 24 hours','86400 s',86400,'s','The trip took three days.'),
 ue('week','wk','weeks','time','a unit of time equal to seven days','604800 s',604800,'s','The course lasts six weeks.'),
 ue('year','yr','years','time','a unit of time equal to about 365 days','31536000 s',31536000,'s','She lived abroad for one year.','Calendar year approximation.'),
]
obj['unitSections'].append(sec('time-units','Time units','Common units for measuring time.',time))

temp=[
 ue('degree Celsius','°C','degrees Celsius','temperature','a temperature scale where water freezes at 0 and boils at 100','offset formula',1,'°C','It is 25 degrees Celsius today.','C to F: (C*9/5)+32; C to K: C+273.15.'),
 ue('degree Fahrenheit','°F','degrees Fahrenheit','temperature','a temperature scale used mainly in the United States','offset formula',1,'°F','It is 77 degrees Fahrenheit today.','F to C: (F-32)*5/9.'),
 ue('kelvin','K','kelvins','temperature','an absolute temperature scale used in science','offset formula',1,'K','Room temperature is about 293 kelvins.','No degree symbol.'),
]
obj['unitSections'].append(sec('temperature','Temperature units','Common temperature scales and conversion notes.',temp))

digital=[
 ue('bit','b','bits','digital information','the smallest unit of digital information','1/8 byte',0.125,'byte','The flag uses one bit.'),
 ue('byte','B','bytes','digital information','a unit of digital information equal to 8 bits','base unit',1,'byte','The file is 500 bytes.'),
 ue('kilobyte','KB','kilobytes','digital information','about one thousand bytes; sometimes 1,024 bytes in binary use','1000 bytes',1000,'byte','The text file is 20 kilobytes.','Binary systems may use kibibyte (1024 bytes).'),
 ue('megabyte','MB','megabytes','digital information','about one million bytes','1,000,000 bytes',1000000,'byte','The photo is 5 megabytes.'),
 ue('gigabyte','GB','gigabytes','digital information','about one billion bytes','1,000,000,000 bytes',1000000000,'byte','The phone has 128 gigabytes of storage.'),
 ue('terabyte','TB','terabytes','digital information','about one trillion bytes','1,000,000,000,000 bytes',1000000000000,'byte','The drive stores two terabytes.'),
]
obj['unitSections'].append(sec('digital','Digital storage units','Units used for files, memory, and storage.',digital))

angle=[ue('degree','°','degrees','angle','a unit of angle equal to 1/360 of a full turn','pi/180 rad',0.017453292519943295,'rad','A right angle is 90 degrees.'),
 ue('radian','rad','radians','angle','the SI unit of angle','base unit',1,'rad','A full circle is 2 pi radians.')]
obj['unitSections'].append(sec('angle','Angle units','Units used to measure angles and rotation.',angle))

energy=[ue('calorie','cal','calories','energy','a small unit of energy; in food, kilocalories are often called calories','4.184 J',4.184,'J','The label shows energy in calories.','Food labels may mean kcal.'),
 ue('kilocalorie','kcal','kilocalories','energy','a unit of energy equal to 1,000 calories','4184 J',4184,'J','The meal contains 600 kilocalories.'),
 ue('kilowatt-hour','kWh','kilowatt-hours','energy','a unit of energy used for electricity bills','3,600,000 J',3600000,'J','The house used 300 kilowatt-hours this month.')]
obj['unitSections'].append(sec('energy','Energy and power units','Common units for energy in science and daily life.',energy))

pressure=[ue('bar','bar','bars','pressure','a metric pressure unit equal to 100,000 pascals','100000 Pa',100000,'Pa','The tire pressure was 2.2 bar.'),
 ue('pounds per square inch','psi','pounds per square inch','pressure','an imperial/US pressure unit','6894.757293168 Pa',6894.757293168,'Pa','The tire pressure is 32 psi.'),
 ue('atmosphere','atm','atmospheres','pressure','a pressure unit close to average sea-level air pressure','101325 Pa',101325,'Pa','Standard pressure is one atmosphere.')]
obj['unitSections'].append(sec('pressure','Pressure units','Units used for air, tires, and scientific pressure.',pressure))

# Conversions for the converter
obj['conversions']={
 'length':{'base':'metre','units':[{'name':'millimetre','symbol':'mm','factor':0.001},{'name':'centimetre','symbol':'cm','factor':0.01},{'name':'metre','symbol':'m','factor':1},{'name':'kilometre','symbol':'km','factor':1000},{'name':'inch','symbol':'in','factor':0.0254},{'name':'foot','symbol':'ft','factor':0.3048},{'name':'yard','symbol':'yd','factor':0.9144},{'name':'mile','symbol':'mi','factor':1609.344},{'name':'nautical mile','symbol':'nmi','factor':1852}]},
 'mass':{'base':'kilogram','units':[{'name':'milligram','symbol':'mg','factor':0.000001},{'name':'gram','symbol':'g','factor':0.001},{'name':'kilogram','symbol':'kg','factor':1},{'name':'tonne','symbol':'t','factor':1000},{'name':'ounce','symbol':'oz','factor':0.028349523125},{'name':'pound','symbol':'lb','factor':0.45359237},{'name':'stone','symbol':'st','factor':6.35029318}]},
 'volume':{'base':'litre','units':[{'name':'millilitre','symbol':'mL','factor':0.001},{'name':'litre','symbol':'L','factor':1},{'name':'cubic metre','symbol':'m³','factor':1000},{'name':'teaspoon','symbol':'tsp','factor':0.005},{'name':'tablespoon','symbol':'tbsp','factor':0.015},{'name':'US cup','symbol':'cup','factor':0.24},{'name':'US pint','symbol':'pt (US)','factor':0.473176473},{'name':'UK pint','symbol':'pt (UK)','factor':0.56826125},{'name':'US gallon','symbol':'gal (US)','factor':3.785411784},{'name':'UK gallon','symbol':'gal (UK)','factor':4.54609}]},
 'area':{'base':'square metre','units':[{'name':'square foot','symbol':'ft²','factor':0.09290304},{'name':'square metre','symbol':'m²','factor':1},{'name':'acre','symbol':'ac','factor':4046.8564224},{'name':'hectare','symbol':'ha','factor':10000},{'name':'square kilometre','symbol':'km²','factor':1000000}]},
 'speed':{'base':'metre per second','units':[{'name':'metre per second','symbol':'m/s','factor':1},{'name':'kilometre per hour','symbol':'km/h','factor':0.2777777778},{'name':'mile per hour','symbol':'mph','factor':0.44704},{'name':'knot','symbol':'kn','factor':0.5144444444}]},
 'time':{'base':'second','units':[{'name':'second','symbol':'s','factor':1},{'name':'minute','symbol':'min','factor':60},{'name':'hour','symbol':'h','factor':3600},{'name':'day','symbol':'d','factor':86400},{'name':'week','symbol':'wk','factor':604800}]},
 'digital':{'base':'byte','units':[{'name':'bit','symbol':'b','factor':0.125},{'name':'byte','symbol':'B','factor':1},{'name':'kilobyte','symbol':'KB','factor':1000},{'name':'megabyte','symbol':'MB','factor':1000000},{'name':'gigabyte','symbol':'GB','factor':1000000000},{'name':'terabyte','symbol':'TB','factor':1000000000000}]},
 'angle':{'base':'radian','units':[{'name':'degree','symbol':'°','factor':0.017453292519943295},{'name':'radian','symbol':'rad','factor':1}]},
 'temperature':{'base':'celsius','units':[{'name':'Celsius','symbol':'°C','factor':1},{'name':'Fahrenheit','symbol':'°F','factor':1},{'name':'Kelvin','symbol':'K','factor':1}]}
}
obj['phrases']=[
 {'phrase':'a pair of','meaning':'two things used together','example':'I bought a pair of shoes.'},
 {'phrase':'a dozen','meaning':'twelve','example':'We need a dozen eggs.'},
 {'phrase':'half a dozen','meaning':'six','example':'She bought half a dozen rolls.'},
 {'phrase':'a couple of','meaning':'two, or a small number','example':'I will be there in a couple of minutes.'},
 {'phrase':'hundreds of','meaning':'a very large number','example':'Hundreds of people attended the festival.'},
 {'phrase':'point five','meaning':'0.5 in spoken form','example':'The answer is two point five.'},
]
with open('/home/ubuntu/git/english/build/content/numbers-units.json','w',encoding='utf-8') as f: json.dump(obj,f,ensure_ascii=False,indent=2)
print('sections',len(obj['numberSections']),len(obj['unitSections']))
