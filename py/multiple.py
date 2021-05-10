import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import scipy.stats as stats
import statsmodels.stats.multicomp as multi
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
        "kafka": pd.read_csv("./data/study/Kafka-1-8-20-Experiment_1.csv"),
        "rabbitmq": pd.read_csv("./data/study/RabbitMQ-1-8-20-Experiment_7.csv"),
        "num_producers": 1,
        "colors": ["#0D95BC", "#A2B969"]
    },
    {
        "kafka": pd.read_csv("./data/study/Kafka-2-8-20-Experiment_2.csv"),
        "rabbitmq": pd.read_csv("./data/study/RabbitMQ-2-8-20-Experiment_8.csv"),
        "num_producers": 2,
        "colors": ["#E9C46A", "#F4A261"]
    },
    {
        "kafka": pd.read_csv("./data/study/Kafka-4-8-20-Experiment_3.csv"),
        "rabbitmq": pd.read_csv("./data/study/RabbitMQ-4-8-20-Experiment_9.csv"),
        "num_producers": 4,
        "colors": ["#E76F51", "#F4ACB7"]
    },
    {
        "kafka": pd.read_csv("./data/study/Kafka-8-8-20-Experiment_4.csv"),
        "rabbitmq": pd.read_csv("./data/study/RabbitMQ-8-8-20-Experiment_10.csv"),
        "num_producers": 8,
        "colors": ["#48cae4", "#74c69d"]
    },
    {
        "kafka": pd.read_csv("./data/study/Kafka-12-8-20-Experiment_5.csv"),
        "rabbitmq": pd.read_csv("./data/study/RabbitMQ-12-8-20-Experiment_11.csv"),
        "num_producers": 12,
        "colors": ["#ffe169", "#f7b267"]
    },
    {
        "kafka": pd.read_csv("./data/study/Kafka-16-8-20-Experiment_6.csv"),
        "rabbitmq": pd.read_csv("./data/study/RabbitMQ-16-8-20-Experiment_12.csv"),
        "num_producers": 16,
        "colors": ["#c19ee0", "#e9d8a6"]
    }
]

img_output_folder: str = "./data/study/img/"
metric: Metric = Metric.Throughput  # The metric to graph from the files
error_type: ErrorType = ErrorType.STD  # The error type to show in bar graph
remove_tail: int = 20  # The number of values to remove from the beginning of data (producers produce before consumer is ready causing low throughput and high latency in beginning of experiment)
remove_head: int = 20  # The number of values to remove from head of data
fig_width_cm: float = 40.0
fig_height_cm: float = 20.0
dpi = 150
confidence_level: float = 0.95

column: str = "total_throughput" if metric == Metric.Throughput else "average_latency"
keyword: str = column.replace('_' + metric.value, '').capitalize()

colors: list = []
labels: list = []
data_series: list[Series] = []

for data_graph in data_graphs:
    colors.extend(data_graph["colors"])
    label = str(data_graph["num_producers"])
    if "kafka" in data_graph: labels.append("Kafka " + label)
    if "rabbitmq" in data_graph: labels.append("RabbitMQ " + label)

    if remove_head == 0 and remove_tail == 0:
        if "kafka" in data_graph: data_series.append(data_graph["kafka"][column])
        if "rabbitmq" in data_graph: data_series.append(data_graph["rabbitmq"][column])
    elif remove_head == 0 and remove_tail != 0:
        if "kafka" in data_graph: data_series.append(pd.Series(data_graph["kafka"][column].tolist()[remove_tail:]))
        if "rabbitmq" in data_graph: data_series.append(pd.Series(data_graph["rabbitmq"][column].tolist()[remove_tail:]))
    elif remove_head != 0 and remove_tail == 0:
        if "kafka" in data_graph: data_series.append(pd.Series(data_graph["kafka"][column].tolist()[:-remove_head]))
        if "rabbitmq" in data_graph: data_series.append(pd.Series(data_graph["rabbitmq"][column].tolist()[:-remove_head]))
    else:
        if "kafka" in data_graph: data_series.append(pd.Series(data_graph["kafka"][column].tolist()[remove_tail:-remove_head]))
        if "rabbitmq" in data_graph: data_series.append(pd.Series(data_graph["rabbitmq"][column].tolist()[remove_tail:-remove_head]))


max_length = max([*map(lambda col: len(col), data_series)])
max_value = max([*map(lambda col: col.max(), data_series)])
part_size = max_value / (185 / 5)


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
    plt.ylim(ymin=0, ymax=max_value + part_size)
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


def generate_bar_chart(in_data_series: list[Series]) -> None:
    bar_width: float = 0.9
    font_size: int = 10

    means: list[float] = []
    stds: list[float] = []
    sems: list[float] = []
    cis: list[float] = []

    for series in in_data_series:
        means.append(series.mean())
        stds.append(series.std())
        sems.append(series.sem())
        cis.append(mean_confidence_interval(series, confidence_level)[1])

    yerr: list[float] = stds if error_type.value == "std" else (sems if error_type.value == "sem" else cis)
    bars_order: range = range(len(labels))
    interval_capsize: int = 8

    plt.figure(figsize=(cm_to_inch(fig_width_cm), cm_to_inch(fig_height_cm)))
    bar_plot: BarContainer = plt.bar(bars_order, means, yerr=yerr, edgecolor="black", linewidth=1, width=bar_width, capsize=interval_capsize, color=colors)

    for index, rect in enumerate(bar_plot):
        x_middle = rect.get_x() + rect.get_width() / 2.0
        y_middle = rect.get_y() + rect.get_height() / 2.0

        if part_size * 2 > y_middle:
            plt.text(x_middle, rect.get_height() + part_size * 3, round(means[index], 2), ha="center", va="center", fontsize=font_size)
            plt.text(x_middle, rect.get_height() + part_size, round(yerr[index], 2), ha="center", va="center", fontsize=font_size)
        else:
            plt.text(x_middle, part_size * 3, round(means[index], 2), ha="center", va="center", fontsize=font_size)
            plt.text(x_middle, part_size, round(yerr[index], 2), ha="center", va="center", fontsize=font_size)

    plt.xticks(range(len(labels)), labels, fontsize=font_size)

    plt.ylabel("Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.xlabel("Broker/number of producers")
    plt.title(f"{keyword} {metric.value} data | Means/{error_type.value.upper()}s Comparison")
    plt.ylim(ymin=0, ymax=max_value + part_size)
    plt.savefig(f"{img_output_folder}bar-{metric}.png", bbox_inches="tight", dpi=dpi)
    plt.show()


def anova(in_data_series: list[Series]) -> None:
    if len(in_data_series) < 2:
        return print("ANOVA test requires at least 2 groups...")

    fvalue, pvalue = stats.f_oneway(*in_data_series)

    print(f"Results of ANOVA test:\nThe F-statistic is: {str(fvalue)}\n The p-value is: {str(pvalue)}")

    if pvalue < (1 - confidence_level):
        print("The means are different")
    else:
        print("No difference in means")


def tukey_test(in_data_series: list[Series]) -> None:
    df: DataFrame = pd.DataFrame()

    if len(in_data_series) < 3:
        return print("Tukey test requires at least 3 groups...")

    for index, _ in enumerate(in_data_series):
        df[labels[index]] = in_data_series[index]

    stacked_data = df.stack().reset_index()
    stacked_data = stacked_data.rename(columns={"level_1": "groups", 0: "result"})

    tukey_results: multi.TukeyHSDResults = multi.pairwise_tukeyhsd(endog=stacked_data["result"], groups=stacked_data["groups"], alpha=(1.0-confidence_level))
    print(tukey_results.summary())

    tukey_results.plot_simultaneous()
    grand_mean = stacked_data["result"].values.mean()
    plt.vlines(x=grand_mean, ymin=-0.5, ymax=len(data_series) - 0.5, color="red", linestyles="dashed")
    plt.show()


# Filter the data series by slicing before plotting if needed
# data_series = data_series[:6]
# colors = colors[:6]
# labels = labels[:6]

# data_series = data_series[6:12]
# colors = colors[6:12]
# labels = labels[6:12]

generate_line_chart(data_series)
generate_bar_chart(data_series)
anova(data_series)
tukey_test(data_series)
