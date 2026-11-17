# Sistema de Noticias en Kubernetes (kind)

Laboratorio de virtualización con contenedores: clúster Kubernetes de 3 nodos (1 control-plane + 2 workers) creado con **kind**, donde se despliega una aplicación de noticias con tres componentes:

| Componente | Imagen | Service | Acceso |
|---|---|---|---|
| Base de datos MySQL | `mysql:8.0` | `mysql-service` (ClusterIP) | Solo dentro del clúster |
| Sistema de noticias (registro) | `noticias-admin:1.0` | `noticias-admin-service` (NodePort) | http://localhost:30001 |
| Portal (consulta) | `noticias-portal:1.0` | `portal-service` (NodePort) | http://localhost:30000 |

```
Navegador ──► localhost:30001 ──► noticias-admin ──┐
                                                    ├──► mysql-service:3306 ──► Pod mysql
Navegador ──► localhost:30000 ──► portal ───────────┘
```

## Estructura

```
├── kind-config.yaml          # Clúster de 3 nodos + mapeo de puertos 30000/30001
├── noticias-admin/           # App para registrar noticias (Node.js + Express)
├── portal/                   # App para consultar noticias (Node.js + Express)
└── k8s/
    ├── 01-configmaps.yaml    # Variables de MySQL, script SQL inicial y config de las apps
    ├── 02-pods.yaml          # Pods: mysql, noticias-admin, portal
    └── 03-services.yaml      # Services: ClusterIP para MySQL, NodePort para las apps
```

## Despliegue

```bash
# 1. Crear el clúster
kind create cluster --config kind-config.yaml
kubectl get nodes

# 2. Construir las imágenes y cargarlas en los nodos de kind
docker build -t noticias-admin:1.0 ./noticias-admin
docker build -t noticias-portal:1.0 ./portal
kind load docker-image noticias-admin:1.0 noticias-portal:1.0 --name noticias

# 3. ConfigMaps, Pods y Services
kubectl apply -f k8s/01-configmaps.yaml
kubectl apply -f k8s/02-pods.yaml
kubectl apply -f k8s/03-services.yaml

# 4. Verificar
kubectl get configmaps
kubectl get pods -o wide
kubectl get services
```

Esperar a que los 3 pods estén en `Running` (MySQL tarda 30-60 s en iniciar la primera vez) y abrir:

- Registro: http://localhost:30001
- Portal: http://localhost:30000

## Prueba de pérdida de datos (sin volumen persistente)

```bash
kubectl delete pod mysql
kubectl apply -f k8s/02-pods.yaml
# Al recargar el portal solo queda la noticia inicial: las registradas se perdieron.
```

## Limpieza

```bash
kind delete cluster --name noticias
```

> Nota: las contraseñas están en un ConfigMap porque así lo pide el laboratorio. En producción deben ir en un `Secret` (o un gestor de secretos).
