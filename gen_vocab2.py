import re

articles = {
    "en": """
My family has a small garden behind our house. Every morning my mother waters the flowers and my father feeds the little birds. My sister likes to read books under the big tree. I often help my parents plant vegetables like tomatoes and carrots. In spring the garden is full of beautiful colors. Red roses grow next to yellow sunflowers. Small bees fly from flower to flower. Sometimes a white butterfly lands on my hand. Our dog runs around the garden and plays with a ball. In summer we pick fresh fruit from the trees. My grandmother makes sweet jam from the berries. On weekends my friends come to visit and we play games together. The garden is my favorite place because it is peaceful and happy. When evening comes we sit outside and watch the stars appear in the sky. The moon shines bright and the crickets sing their songs. I love our garden very much.
""",
    "zh": """
我的家在学校旁边一条安静的街道上。每天早上妈妈做早饭爸爸送我上学。我的教室在三楼窗户很大光线很好。老师教我们语文数学和英语。课间休息的时候我和同学们在操场上玩跳绳和踢毽子。中午我们在食堂吃饭今天的菜有红烧肉和青菜。放学后我先写作业然后看一会儿动画片。周末的时候全家人一起去公园散步。公园里有湖有山还有很多漂亮的花。爸爸教我骑自行车妈妈在旁边给我们拍照。晚上我们一家人坐在一起吃晚饭聊天。我觉得每天都很开心。
""",
    "es": """
Mi escuela está cerca de una plaza muy bonita. Todos los días mis amigos y yo caminamos juntos por la mañana. En clase la profesora nos enseña a leer y escribir. Me gusta mucho la hora del recreo porque juego con mis compañeros. Compartimos nuestra merienda y contamos historias graciosas. Los martes tenemos clase de música donde aprendemos canciones nuevas. El jueves es mi día favorito porque hay clase de arte y puedo pintar. Mi mejor amigo se llama Pedro y siempre nos sentamos juntos. Después de escuela voy a mi casa y hago la tarea. Mi abuela prepara una sopa deliciosa para la cena. Los domingos visitamos a mis abuelos y les cuento sobre mi semana. Ellos me dan consejos y me cuentan historias de cuando eran jóvenes. Me siento muy feliz con mi familia y amigos.
""",
    "de": """
In unserem Dorf gibt es einen kleinen See. Im Sommer schwimmen die Kinder dort und bauen Sandburgen am Ufer. Mein Bruder und ich fahren mit dem Fahrrad zum See. Das Wasser ist klar und kleine Fische schwimmen darin. Am Wochenende gehen wir oft in den Wald hinter unserem Haus. Wir sammeln Pilze und Beeren für die Küche. Manchmal sehen wir Rehe oder Hasen zwischen den Bäumen. Im Herbst fallen die bunten Blätter vom Himmel. Wir machen einen großen Haufen und springen hinein. Das macht viel Spaß. Im Winter ist der See zugefroren und wir laufen Schlittschuh. Der Schnee glitzert in der Sonne und wir bauen einen Schneemann. Meine Mutter macht heiße Schokolade wenn wir nach Hause kommen. Das Leben auf dem Land ist schön und ruhig.
""",
    "fr": """
Pendant les vacances nous allons chez mes grands-parents à la campagne. Leur maison a un grand jardin avec des pommiers et un petit ruisseau. Le matin je aide mon grand-père à nourrir les poules et les canards. Les poules pondent des œufs frais chaque jour. Ma grand-mère prépare des crêpes pour le petit déjeuner. Elles sont délicieuses avec du miel ou de la confiture. Laprès-midi je explore le champ derrière la maison. Jy trouve des coccinelles des papillons et parfois un petit hérisson. Le soir toute la famille dîne ensemble dans la cuisine. Mon grand-père raconte des histoires de sa jeunesse. Nous écoutons avec attention et rions beaucoup. La nuit les grenouilles chantent près de létang. Jaime ces moments simples et chaleureux avec ma famille.
""",
    "ja": """
私の町には古いお寺があります。春になると桜の花が咲いてとてもきれいです。友達と一緒に花見に行ってお弁当を食べます。夏は暑いので川で泳ぎます。水は冷たくて気持ちがいいです。秋には紅葉が美しくて写真をたくさん撮ります。冬は雪が降って町が白くなります。家族と雪だるまを作ったり雪合戦をしたりします。お正月にはおばあちゃんの家に行きます。おせち料理を食べてお年玉をもらいます。毎日学校で新しいことを勉強して楽しいです。放課後は友達と公園で遊びます。先生はやさしくて授業はいつも面白いです。私はこの町が大好きです。
"""
}

all_words = set()

for lang, article in articles.items():
    if lang == "zh":
        chars = re.findall(r'[\u4e00-\u9fff]', article)
        unique = sorted(set(chars))
        print(f"{lang}: {len(chars)} chars, {len(unique)} unique")
        for c in unique[:20]:
            print(f"  {c}", end="")
        print("...")
    elif lang == "ja":
        chars = re.findall(r'[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]', article)
        unique = sorted(set(chars))
        print(f"{lang}: {len(chars)} chars, {len(unique)} unique")
        for c in unique[:20]:
            print(f"  {c}", end="")
        print("...")
    else:
        words = re.findall(r'[a-zA-Z]+', article.lower())
        unique = sorted(set(words))
        all_words.update(unique)
        print(f"{lang}: {len(words)} words, {len(unique)} unique")

print(f"\nTotal unique en/es/de/fr words: {len(all_words)}")
print(f"\nBACKUP_VOCAB = [")
sorted_words = sorted(all_words)
for i in range(0, len(sorted_words), 8):
    chunk = sorted_words[i:i+8]
    line = ", ".join(f'"{w}"' for w in chunk)
    print(f'    {line},')
print(']')
