# Exjobb-2021-a18antsv
Bachelor Degree Project in Informatics with a Specialization in Web Programming

## About The Project
Message-oriented middleware can be used as a common means of communication between services in a micro-service architecture to decouple services and allow for asynchronous communication. An expansion of the system places additional demands on the middleware software; increasing nodes that produce more and more data must not have negative consequences for the rest of the system.

Two common message brokers are Apache Kafka and RabbitMQ, which are examined in this project to find out which one performs best in a system that sees a sharp increase in the number of producers. The study covers the set-up of these systems to increase the number of producers during experiments and to compare the throughput and latency of the two message brokers. One area applied in this study is the collection of measurement values from air quality sensors, which would be the first step in a system that analyzes important data for the future prosperity of humans.

## Getting Started
* Download and install Docker Desktop for Windows 10: https://www.docker.com/products/docker-desktop
* Run the following commands in Powershell:
  * Activate Windows Subsystem for Linux (WSL) and Virtual Machine Platform: `Enable-WindowsOptionalFeature -Online -FeatureName $("VirtualMachinePlatform", "Microsoft-Windows-Subsystem-Linux")`
  * Set default WSL version to 2: `wsl --set-default-version 2`
* Download and install update package for Linux kernel: https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi 
* Download and install Linux distribution (e.g. Ubuntu) from Microsoft Store: https://www.microsoft.com/sv-se/p/ubuntu-2004-lts/9n6svws3rx71 
* Do the following from within WSL:
  * Clone GitHub repository: `git clone https://github.com/a18antsv/Exjobb-2021-a18antsv.git`
  * Change directory into the cloned directory: `cd ./Exjobb-2021-a18antsv`
  * Make bash scripts executable if permission denied: `chmod +x ./sh/*`

## Usage
Execute all commands having project directory ./Exjobb-2021-a18antsv as the working directory and within WSL.
### Starting
* Build Docker images from applications: `./sh/dashboard-build.sh && ./sh/kafka-build-services.sh && ./sh/rabbitmq-build-services.sh`
* Create and start Dashboard application container: `./sh/dashboard-start.sh`
* Experiments can be created and started from the dashboard application. Keep in mind that the first experiment will start slowly since Kafka, Zookeeper and RabbitMQ Docker images will have to be pulled from Docker Hub before the first experiment can be started.
* When using the application for the second time and the dashboard-app container was not removed earlier, it can be started using: `docker start dashboard-app`

### Stopping
* Stopping an experiment will completely remove all containers associated with it
* A running experiment can be stopped from the dashboard application manually and a completed experiment will be stopped automatically
* Stop and remove dashboard application container: `./sh/dashboard-stop.sh`
* Manually stopping experiments (generally only used if forgetting to stop experiments using the dashboard application):
  * Stop running Kafka experiment with 5 producers and 3 consumers: `./sh/kafka-stop-experiment.sh 5 3`
  * Stop running RabbitMQ experiment with 5 producers and 3 consumers: `./sh/rabbitmq-stop-experiment.sh 5 3`
* Stop dashboard-app container without removing for reuse: `docker stop dashboard-app`

### Clean up
* Remove all built Docker images (dashboard, Kafka producer, Kafka consumer, RabbitMQ producer, RabbitMQ consumer): `./sh/remove-all-images.sh`
* The command above does not remove pulled images (Kafka, Zookeeper, RabbitMQ)

## License
Distributed under the MIT License. See [LICENSE](https://github.com/a18antsv/Exjobb-2021-a18antsv/blob/main/LICENSE) for more information.

## Contact
Mail to: [Anton Svensson](mailto:a18antsv@student.his.se?subject=[GitHub]%20Exjobb-2021-a18antsv) (a18antsv@student.his.se)
Project link: [https://github.com/a18antsv/Exjobb-2021-a18antsv](https://github.com/a18antsv/Exjobb-2021-a18antsv)

## Acknowledgements
* [Kafka](https://kafka.apache.org/)
* [RabbitMQ](https://www.rabbitmq.com/)
* [Docker](https://www.docker.com/)
