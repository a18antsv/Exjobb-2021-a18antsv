import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import scipy.stats as stats
from matplotlib.container import BarContainer
from pandas import Series
import enum


class Metric(str, enum.Enum):
    Throughput = "throughput"
    Latency = "latency"


class ErrorType(str, enum.Enum):
    STD = "std"
    SEM = "sem"
    CI = "ci"


# The .csv structure looks like this ["time"], ["producer-service-1_throughput"]....., ["total_throughput"], ["producer-service-1_latency"]....., ["average_latency"]
data_graphs: list[dict] = [
    {
        "kafka": pd.read_csv("./data/pilot_study/Kafka-1-5-Pilotstudie.csv"),
        "rabbitmq": pd.read_csv("./data/pilot_study/RabbitMQ-1-5-Pilotstudie.csv"),
        "num_producers": 1
    },
    {
        "kafka": pd.read_csv("./data/pilot_study/Kafka-3-5-Pilotstudie.csv"),
        "rabbitmq": pd.read_csv("./data/pilot_study/RabbitMQ-3-5-Pilotstudie.csv"),
        "num_producers": 3
    },
    {
        "kafka": pd.read_csv("./data/pilot_study/Kafka-5-5-Pilotstudie.csv"),
        "rabbitmq": pd.read_csv("./data/pilot_study/RabbitMQ-5-5-Pilotstudie.csv"),
        "num_producers": 5
    }
]

img_output_folder: str = "./data/pilot_study/img/"
metric: Metric = Metric.Throughput  # The metric to graph from the files
error_type: ErrorType = ErrorType.STD  # The error type to show in bar graph
remove_tail: int = 10  # The number of values to remove from the beginning of data (producers produce before consumer is ready causing low throughput and high latency in beginning of experiment)
remove_head: int = 10  # The number of values to remove from head of data
fig_width_cm: float = 32
fig_height_cm: float = 16
dpi = 150

colors: tuple = ("#0D95BC", "#A2B969", "#e9c46a", "#f4a261", "#e76f51", "#f4acb7")
column: str = "total_throughput" if metric == Metric.Throughput else "average_latency"
keyword: str = column.replace('_' + metric.value, '').capitalize()
labels: list = []
data_series: list[Series] = []

for data_graph in data_graphs:
    label = str(data_graph["num_producers"])
    labels.append("Kafka " + label)
    labels.append("RabbitMQ " + label)

    if remove_head == 0 or remove_tail == 0:
        data_series.append(data_graph["kafka"][column])
        data_series.append(data_graph["rabbitmq"][column])
    else:
        data_series.append(pd.Series(data_graph["kafka"][column].tolist()[remove_tail:-remove_head]))
        data_series.append(pd.Series(data_graph["rabbitmq"][column].tolist()[remove_tail:-remove_head]))


max_length = max([*map(lambda col: len(col), data_series)])


def cm_to_inch(value):
    return value / 2.54


def generate_line_chart(in_data_series: list[Series]) -> None:
    plt.figure(figsize=(cm_to_inch(fig_width_cm), cm_to_inch(fig_height_cm)))
    for index, _ in enumerate(in_data_series):
        y = in_data_series[index]
        x = range(1, len(y) + 1)  # First data point at 1 instead of 0
        plt.plot(x, y, label=labels[index], linewidth="2", color=colors[index])

    plt.xlabel("Message aggregation (#)")
    plt.ylabel(f"Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.title(f"{keyword} {metric.value} data")
    plt.legend(loc="upper right")
    plt.grid(True)
    plt.ylim(ymin=0)
    if remove_head == 0 or remove_tail == 0:
        plt.xlim(xmin=0, xmax=max_length)
    else:
        plt.xlim(xmin=0, xmax=max_length - (remove_head + remove_tail))
    plt.savefig(f"{img_output_folder}line-{metric}.png", bbox_inches="tight", dpi=dpi)
    plt.show()


def mean_confidence_interval(data, confidence=0.95) -> tuple:
    a = 1.0 * np.array(data)
    n = len(a)
    m, se = np.mean(a), stats.sem(a)
    h = se * stats.t.ppf((1 + confidence) / 2., n - 1)
    return -h, +h


def generate_bar_chart(in_data_series) -> None:
    bar_width: float = 0.9
    means: list[float] = []
    stds: list[float] = []
    sems: list[float] = []
    cis: list[float] = []

    for series in in_data_series:
        means.append(series.mean())
        stds.append(series.std())
        sems.append(series.sem())
        cis.append(mean_confidence_interval(series)[1])

    yerr: list[float] = stds if error_type.value == "std" else (sems if error_type.value == "sem" else cis)
    bars_order: range = range(len(labels))
    interval_capsize: int = 8

    plt.figure(figsize=(cm_to_inch(fig_width_cm), cm_to_inch(fig_height_cm)))
    bar_plot: BarContainer = plt.bar(bars_order, means, yerr=yerr, edgecolor="black", width=bar_width, capsize=interval_capsize, color=colors)

    for index, rect in enumerate(bar_plot):
        x_middle = rect.get_x() + rect.get_width() / 2.0
        y_middle = rect.get_y() + rect.get_height() / 2.0
        plt.text(x_middle, y_middle + rect.get_height() / 4, round(means[index], 4), ha="center",
                 va="center", fontsize=10)
        plt.text(x_middle, y_middle - rect.get_height() / 4, round(yerr[index], 4),
                 ha="center", va="center", fontsize=10)

    plt.xticks(range(len(labels)), labels, fontsize=10)

    plt.ylabel("Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.xlabel("Broker/number of producers")
    plt.title(f"{keyword} {metric.value} data | Means/{error_type.value.upper()}s Comparison")
    plt.ylim(ymin=0)
    plt.savefig(f"{img_output_folder}bar-{metric}-.png", bbox_inches="tight", dpi=dpi)
    plt.show()


generate_line_chart(data_series)
generate_bar_chart(data_series)
