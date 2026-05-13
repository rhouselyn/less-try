import re

article = """
Technology has transformed the way we communicate and work across the globe. 
Modern companies rely on digital platforms to connect employees who work remotely from different cities and countries. 
Cloud computing allows businesses to store vast amounts of data securely without needing physical servers in every office. 
Artificial intelligence helps researchers analyze complex problems and discover patterns that humans might overlook. 
Education systems around the world are adopting online learning tools to reach students in rural areas where traditional schools are scarce. 
Environmental scientists monitor climate changes through satellite imagery and sensor networks deployed across oceans and forests. 
Transportation networks have evolved with electric vehicles and autonomous driving systems that reduce accidents and fuel consumption. 
Healthcare professionals use telemedicine to consult patients in distant regions, providing diagnosis and treatment plans through video conferences. 
Financial institutions implement blockchain technology to ensure transparent and secure transactions across international borders. 
Creative industries embrace virtual reality to design immersive experiences for entertainment and professional training programs. 
Agricultural engineers develop precision farming techniques using drones and sensors to optimize water usage and crop yields. 
Urban planners integrate smart city infrastructure to manage traffic flow, energy distribution, and waste recycling efficiently. 
Space agencies collaborate on international missions to explore distant planets and study the origins of our universe. 
Communication networks continue to expand with fiber optic cables and satellite constellations providing broadband access to remote communities. 
Manufacturing facilities adopt robotic automation to improve production quality while maintaining safe working conditions for operators.
"""

words = re.findall(r'[a-zA-Z]+', article.lower())
unique_words = sorted(set(words))

print(f"文章总单词数: {len(words)}")
print(f"去重后单词数: {len(unique_words)}")
print()
print("词库列表:")
print(f'BACKUP_VOCAB = [')
for i in range(0, len(unique_words), 8):
    chunk = unique_words[i:i+8]
    line = ", ".join(f'"{w}"' for w in chunk)
    print(f'    {line},')
print(']')
