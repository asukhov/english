import json
p='/home/ubuntu/git/english/build/content/numbers-units.json'
d=json.load(open(p))
def ne(word,symbol,ipa,explanation,example,note=""):
    return {"word":word,"symbol":str(symbol),"ipa":ipa,"explanation":explanation,"example":example,"note":note}
def ue(name,symbol,plural,quantity,definition,relation,factor,base,example,note=""):
    return {"name":name,"symbol":symbol,"plural":plural,"quantity":quantity,"definition":definition,"relation":relation,"factor":factor,"base":base,"example":example,"note":note}
# Add more number entries
for sec in d['numberSections']:
    if sec['id']=='large-numbers':
        sec['entries']+=[
            ne('ten thousand','10,000','/ten ˈθaʊzənd/','ten times one thousand','The arena seats ten thousand people.'),
            ne('hundred thousand','100,000','/ˈhʌndrəd ˈθaʊzənd/','one hundred times one thousand','The city has a hundred thousand residents.'),
        ]
    if sec['id']=='fractions-math':
        sec['entries']+=[
            ne('two thirds','2/3','/tuː θɜːdz/','two of three equal parts','Two thirds of the students agreed.'),
            ne('three quarters','3/4','/θriː ˈkwɔːtəz/','three of four equal parts','Three quarters of the work is done.'),
            ne('one and a half','1.5','/wʌn ənd ə hɑːf/','one plus one half','The walk took one and a half hours.'),
            ne('percentage','25%','/pəˈsentɪdʒ/','an amount expressed as part of 100','The percentage of errors was low.'),
            ne('ratio','2:1','/ˈreɪʃiəʊ/','a comparison of two quantities','Mix water and juice in a 2:1 ratio.'),
            ne('square root','√','/skweə ruːt/','a number that multiplies by itself to give another number','The square root of nine is three.'),
        ]
    if sec['id']=='dates-time':
        sec['entries']+=[
            ne('noon','12:00','/nuːn/','twelve o’clock in the middle of the day','We will meet at noon.'),
            ne('midnight','00:00','/ˈmɪdnaɪt/','twelve o’clock at night','The bus leaves at midnight.'),
            ne('quarter past','15','/ˈkwɔːtə pɑːst/','fifteen minutes after the hour','It is quarter past six.'),
            ne('quarter to','45','/ˈkwɔːtə tuː/','fifteen minutes before the hour','It is quarter to seven.'),
            ne('half past','30','/hɑːf pɑːst/','thirty minutes after the hour','The class starts at half past nine.'),
        ]
# Add unit sections/entries
d['unitSections'].append({'id':'cooking','title':'Cooking measures','intro':'Common measures used in recipes. Units vary by country.','entries':[
 ue('pinch','pinch','pinches','cooking volume','a very small amount held between finger and thumb','approximate',0.0000003,'m^3','Add a pinch of salt.','Approximate measure.'),
 ue('dash','dash','dashes','cooking volume','a very small liquid amount','approximate',0.0000006,'m^3','Add a dash of vinegar.'),
 ue('fluid ounce','fl oz','fluid ounces','volume','a liquid volume unit; US 29.5735 mL, UK 28.4131 mL','US 29.5735 mL',0.0000295735295625,'m^3','Add eight fluid ounces of water.','US value used as default factor.'),
 ue('quart','qt','quarts','volume','a unit equal to two pints','US 0.946352946 L',0.000946352946,'m^3','Buy a quart of milk.','US quart default.'),
]})
d['unitSections'].append({'id':'astronomical-nautical','title':'Nautical and astronomical units','intro':'Units used for sea travel and space distances.','entries':[
 ue('fathom','ftm','fathoms','length','a nautical unit of depth equal to 1.8288 metres','6 ft',1.8288,'m','The water was ten fathoms deep.'),
 ue('league','lea','leagues','length','a historical distance unit, often about 4.828 kilometres','3 miles',4828.032,'m','The ship was many leagues away.','Historical/literary.'),
 ue('astronomical unit','AU','astronomical units','length','the average distance from Earth to the Sun','149,597,870,700 m',149597870700,'m','Mars is about 1.5 astronomical units from the Sun.'),
 ue('light-year','ly','light-years','length','the distance light travels in one year','9.4607e15 m',9460730472580800,'m','The star is four light-years away.'),
]})
# add more to existing sections
for sec in d['unitSections']:
    if sec['id']=='length':
        sec['entries']+=[
            ue('micrometre','µm','micrometres','length','a metric unit equal to one millionth of a metre','1e-6 m',0.000001,'m','A human hair is about 70 micrometres thick.'),
            ue('nanometre','nm','nanometres','length','a metric unit equal to one billionth of a metre','1e-9 m',0.000000001,'m','DNA is about two nanometres wide.'),
        ]
    if sec['id']=='mass':
        sec['entries']+=[
            ue('carat','ct','carats','mass','a unit of mass used for gemstones, equal to 200 milligrams','0.0002 kg',0.0002,'kg','The diamond weighs one carat.'),
            ue('metric ton','t','metric tons','mass','another name for tonne, equal to 1,000 kilograms','1000 kg',1000,'kg','The shipment weighed three metric tons.'),
        ]
    if sec['id']=='digital':
        sec['entries']+=[
            ue('kibibyte','KiB','kibibytes','digital information','a binary unit equal to 1,024 bytes','1024 bytes',1024,'byte','The file size is shown as 4 kibibytes.','Binary prefix.'),
            ue('mebibyte','MiB','mebibytes','digital information','a binary unit equal to 1,048,576 bytes','1024 KiB',1048576,'byte','The image is 2 mebibytes.'),
        ]
    if sec['id']=='area':
        sec['entries']+=[
            ue('square mile','mi²','square miles','area','an area equal to 2,589,988.110336 square metres','2,589,988.110336 m^2',2589988.110336,'m^2','The island is 10 square miles.'),
            ue('square inch','in²','square inches','area','an area equal to 0.00064516 square metre','0.00064516 m^2',0.00064516,'m^2','The label is four square inches.'),
        ]
    if sec['id']=='energy':
        sec['entries']+=[
            ue('electronvolt','eV','electronvolts','energy','a very small energy unit used in physics','1.602176634e-19 J',1.602176634e-19,'J','Particle energies are measured in electronvolts.'),
        ]
# add phrases
d['phrases']+=[
 {'phrase':'twofold','meaning':'two times as much or as many','example':'Sales increased twofold.'},
 {'phrase':'one in ten','meaning':'one out of every ten','example':'One in ten people preferred the new design.'},
 {'phrase':'odd number','meaning':'a whole number not divisible by 2','example':'Three is an odd number.'},
 {'phrase':'even number','meaning':'a whole number divisible by 2','example':'Four is an even number.'},
]
with open(p,'w',encoding='utf-8') as f: json.dump(d,f,ensure_ascii=False,indent=2)
print(sum(len(s['entries']) for s in d['numberSections']), sum(len(s['entries']) for s in d['unitSections']))
