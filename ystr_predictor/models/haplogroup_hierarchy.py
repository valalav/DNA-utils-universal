import httpx
from typing import List, Dict

class HaplogroupHierarchy:
    def __init__(self):
        self.ftdna_api_url = "http://localhost:9003/api"
        self.haplogroup_map = {}
        self.reverse_map = {}
        self.haplogroup_details = {}
        
    async def update_haplogroups(self, haplogroups: List[str]):
        # Обновляем маппинги для кодирования/декодирования
        self.haplogroup_map = {hg: idx for idx, hg in enumerate(sorted(haplogroups))}
        self.reverse_map = {idx: hg for hg, idx in self.haplogroup_map.items()}
        
        # Получаем детали для каждой гаплогруппы
        async with httpx.AsyncClient() as client:
            for haplogroup in haplogroups:
                try:
                    response = await client.get(
                        f"{self.ftdna_api_url}/search/{haplogroup}"
                    )
                    if response.status_code == 200:
                        self.haplogroup_details[haplogroup] = response.json()
                except Exception as e:
                    print(f"Error fetching details for {haplogroup}: {e}")
    
    def encode_haplogroups(self, haplogroups: List[str]) -> List[int]:
        return [self.haplogroup_map[hg] for hg in haplogroups]
    
    async def decode_predictions(self, predictions: List[Dict]) -> List[Dict]:
        decoded = []
        
        for pred in predictions:
            haplogroup = self.reverse_map[pred["class_index"]]
            decoded_pred = {
                "haplogroup": haplogroup,
                "probability": pred["probability"],
                "details": self.haplogroup_details.get(haplogroup, {})
            }
            decoded.append(decoded_pred)
            
        return decoded