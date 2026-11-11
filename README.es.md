# OpenFamilyOffice

<p align="center">
  <strong>Sistema operativo de código abierto para family office ágil e inteligencia financiera multientidad para familias, autónomos, monotributistas y pequeñas empresas en todo el mundo.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-blue.svg" alt="Licencia: MIT"></a>
  <a href="docs/EGM_DEVELOPMENT_SPEC.md"><img src="https://img.shields.io/badge/arquitectura-EGM%20Spec--Driven-orange.svg" alt="EGM Spec-Driven"></a>
  <a href="ROADMAP.md"><img src="https://img.shields.io/badge/estado-Arquitectura%20%26%20Dise%C3%B1o-green.svg" alt="Estado: Arquitectura & Diseño"></a>
  <a href="#"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
  <a href="#"><img src="https://img.shields.io/badge/privacidad-LGPD%20%2F%20GDPR-purple.svg" alt="LGPD / GDPR Ready"></a>
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> &ensp;·&ensp;
  <a href="README.pt-BR.md"><strong>Português (Brasil)</strong></a> &ensp;·&ensp;
  <a href="README.es.md"><strong>Español</strong></a>
</p>

---

## ¿Qué es OpenFamilyOffice?

Históricamente, las herramientas avanzadas de inteligencia financiera y gestión patrimonial han sido exclusivas de familias con grandes patrimonios (*Family Offices*) o de grandes corporaciones (costosos sistemas ERP). Por el contrario, los profesionales independientes, autónomos y pequeñas empresas deben lidiar con hojas de cálculo aisladas, múltiples aplicaciones bancarias y flujos de caja comerciales caóticos.

Las demostraciones recientes de "equipos financieros de IA autónomos" suelen fracasar en la práctica por razones críticas: **alucinaciones matemáticas en el cálculo de flujo de caja, ausencia de conciliación contable, confusión entre finanzas personales y empresariales, y desconocimiento de normativas tributarias reales**.

**OpenFamilyOffice** se fundamenta en un principio rector innegociable:

$$\Large \textbf{El Código Determinista Calcula} \quad \boldsymbol{+} \quad \textbf{La IA Interpreta}$$

1. **Algoritmos deterministas en Python/SQL** calculan el runway (meses de supervivencia), los márgenes de contribución, los límites fiscales y el flujo de caja de 13 semanas con absoluta precisión matemática.
2. **Un Consejo Asesor de Agentes de IA especializados** utiliza estos datos validados para detectar anomalías, analizar riesgos, proponer estrategias de precios y generar un **Informe Ejecutivo Semanal de 1 página** para la toma de decisiones familiares.

---

## Pilares Fundamentales

1. **Separación Multientidad Estricta**: Aislamiento total entre las finanzas del hogar (personal) y las actividades de los negocios operativos, previniendo mezclas indebidas mientras se consolida el patrimonio neto familiar total.
2. **Motor Contable en Tres Perspectivas**:
   * *Perspectiva Financiera (Flujo de Caja)*: Dinero real disponible y proyección de liquidez a 13 semanas.
   * *Perspectiva de Gestión (Devengo)*: Servicios facturados, costes directos y margen unitario real por cliente.
   * *Perspectiva Patrimonial (Balance General)*: Activos totales, ratio de deuda y patrimonio neto familiar ajustado a la inflación.
3. **Controlador Financiero y Conciliación Invariante**:
   * Neutralización de transferencias internas (para evitar duplicaciones artificiales de ingresos y gastos).
   * Conciliación del ciclo de tarjetas de crédito sin duplicar gastos.
   * Niveles de confianza verificados (`CONFIRMED`, `ESTIMATED`, `PENDING`).
4. **Desarrollado con el Elephant-Goldfish Model (EGM) de Google**:
   * *El Elefante*: Mantiene el contexto a largo plazo y redacta especificaciones técnicas formales sin escribir código apresurado.
   * *El Pez Dorado (Auditor Adversario / Red Team)*: Agente sin sesgo conversacional previo que cuestiona supuestos frágiles y analiza escenarios extremos antes de que se apruebe cualquier decisión.
5. **Gobernanza Familiar y Control Humano**: La IA nunca mueve dinero ni ejecuta pagos de forma autónoma. Todas las decisiones financieras relevantes requieren la aprobación explícita de los titulares familiares.
6. **Privacidad y Soberanía de Datos**: Procesamiento de datos confidenciales y extractos bancarios en local mediante SQLite WAL y motores deterministas, aplicando enmascaramiento estricto antes de enviar cualquier consulta a modelos en la nube.

---

## Estructura del Repositorio

* `docs/`: Especificaciones formales del sistema (`PROJECT_CHARTER.md`, `FINANCIAL_DATA_ARCHITECTURE.md`, `AI_GOVERNANCE.md`, `CRISIS_PLAYBOOK.md`, `EGM_DEVELOPMENT_SPEC.md`).
* `prompts/`: Colección de prompts especializados para cada agente con formato JSON estructurado.
* `templates/`: Plantillas CSV estándar para entidades, categorías, transacciones e informe semanal.
* `ROADMAP.md`: Plan de desarrollo por fases (desde el motor determinista hasta la interfaz web y conectores bancarios).

---

## Licencia

Este proyecto es software de código abierto publicado bajo la licencia [MIT License](LICENSE).

