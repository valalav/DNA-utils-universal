# c:\projects\DNA-utils-universal\ystr_predictor\scripts\deploy.py
import subprocess
import time
from typing import Tuple
import yaml
import logging
from kubernetes import client, config
from datetime import datetime

class BlueGreenDeployer:
    def __init__(self):
        config.load_kube_config()
        self.v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()
        self.networking_v1 = client.NetworkingV1Api()
        self.logger = logging.getLogger(__name__)
        
    def get_current_color(self) -> str:
        """Определяет текущий активный цвет"""
        try:
            ingress = self.networking_v1.read_namespaced_ingress(
                name="ystr-predictor-ingress",
                namespace="default"
            )
            service_name = ingress.spec.rules[0].http.paths[0].backend.service.name
            return "blue" if "blue" in service_name else "green"
        except Exception as e:
            self.logger.error(f"Error getting current color: {e}")
            return "blue"  # По умолчанию считаем синим
            
    def deploy_new_version(self, image: str) -> bool:
        """Развертывание новой версии"""
        try:
            current_color = self.get_current_color()
            new_color = "green" if current_color == "blue" else "blue"
            
            # Обновляем deployment
            deployment = self.apps_v1.read_namespaced_deployment(
                name=f"ystr-predictor-{new_color}",
                namespace="default"
            )
            
            deployment.spec.template.spec.containers[0].image = image
            
            self.apps_v1.patch_namespaced_deployment(
                name=f"ystr-predictor-{new_color}",
                namespace="default",
                body=deployment
            )
            
            # Ждем готовности подов
            self._wait_for_deployment_ready(f"ystr-predictor-{new_color}")
            
            # Проверяем работоспособность
            if not self._health_check(new_color):
                self.logger.error("Health check failed for new deployment")
                return False
                
            # Переключаем трафик
            self._switch_traffic(new_color)
            
            # Проверяем метрики после переключения
            if not self._verify_metrics():
                self.logger.error("Metrics verification failed")
                self._rollback(current_color)
                return False
                
            return True
            
        except Exception as e:
            self.logger.error(f"Deployment error: {e}")
            return False
            
    def _wait_for_deployment_ready(self, deployment_name: str, timeout: int = 300):
        """Ожидание готовности deployment"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            deployment = self.apps_v1.read_namespaced_deployment_status(
                name=deployment_name,
                namespace="default"
            )
            
            if deployment.status.ready_replicas == deployment.status.replicas:
                return True
            time.sleep(5)
            
        raise TimeoutError(f"Deployment {deployment_name} not ready within timeout")
        
    def _health_check(self, color: str) -> bool:
        """Проверка работоспособности новой версии"""
        try:
            # Проверяем все поды
            pods = self.v1.list_namespaced_pod(
                namespace="default",
                label_selector=f"app=ystr-predictor,color={color}"
            )
            
            for pod in pods.items:
                response = subprocess.run(
                    ["kubectl", "exec", pod.metadata.name, "--", 
                     "curl", "-s", "http://localhost:8000/health"],
                    capture_output=True
                )
                if response.returncode != 0:
                    return False
                    
            return True
            
        except Exception as e:
            self.logger.error(f"Health check error: {e}")
            return False
            
    def _switch_traffic(self, new_color: str):
        """Переключение трафика на новую версию"""
        ingress = self.networking_v1.read_namespaced_ingress(
            name="ystr-predictor-ingress",
            namespace="default"
        )
        
        ingress.spec.rules[0].http.paths[0].backend.service.name = f"ystr-predictor-{new_color}"
        
        self.networking_v1.patch_namespaced_ingress(
            name="ystr-predictor-ingress",
            namespace="default",
            body=ingress
        )
        
    def _verify_metrics(self, threshold: float = 0.1) -> bool:
        """Проверка метрик после переключения"""
        try:
            # Проверяем основные метрики
            metrics = self._get_prometheus_metrics()
            
            # Проверяем ошибки
            if metrics['error_rate'] > threshold:
                return False
                
            # Проверяем латентность
            if metrics['latency_p95'] > 500:  # ms
                return False
                
            return True
            
        except Exception as e:
            self.logger.error(f"Metrics verification error: {e}")
            return False
            
    def _rollback(self, previous_color: str):
        """Откат к предыдущей версии"""
        try:
            self._switch_traffic(previous_color)
            self.logger.info(f"Rolled back to {previous_color} deployment")
        except Exception as e:
            self.logger.error(f"Rollback error: {e}")
            
    def cleanup_old_deployment(self, color: str):
        """Очистка старой версии"""
        try:
            # Удаляем старые поды
            self.apps_v1.delete_namespaced_deployment(
                name=f"ystr-predictor-{color}",
                namespace="default"
            )
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="New image to deploy")
    args = parser.parse_args()
    
    deployer = BlueGreenDeployer()
    if deployer.deploy_new_version(args.image):
        print("Deployment successful")
    else:
        print("Deployment failed")
        exit(1)